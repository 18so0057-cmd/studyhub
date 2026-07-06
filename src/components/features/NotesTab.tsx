import { useState, useRef, useEffect } from "react";
import { 
  useListNotes, 
  useCreateNote, 
  useUpdateNote, 
  useDeleteNote, 
  getListNotesQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Plus, Trash2, FileText, Search, CalendarIcon, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { earnPoints } from "@/hooks/usePoints";

// ─── Color palette ────────────────────────────────────────────────────────────
const NOTE_COLORS = [
  { id: "default", label: "Default",   bg: "",               border: "",               dot: "bg-muted-foreground/30" },
  { id: "red",     label: "Red",       bg: "bg-red-50",      border: "border-red-200", dot: "bg-red-400" },
  { id: "orange",  label: "Orange",    bg: "bg-orange-50",   border: "border-orange-200", dot: "bg-orange-400" },
  { id: "yellow",  label: "Yellow",    bg: "bg-yellow-50",   border: "border-yellow-200", dot: "bg-yellow-400" },
  { id: "green",   label: "Green",     bg: "bg-green-50",    border: "border-green-200", dot: "bg-green-400" },
  { id: "blue",    label: "Blue",      bg: "bg-blue-50",     border: "border-blue-200",  dot: "bg-blue-400" },
  { id: "purple",  label: "Purple",    bg: "bg-purple-50",   border: "border-purple-200", dot: "bg-purple-400" },
  { id: "pink",    label: "Pink",      bg: "bg-pink-50",     border: "border-pink-200",  dot: "bg-pink-400" },
] as const;

type NoteColorId = typeof NOTE_COLORS[number]["id"];

function getColorConfig(colorId: string | null | undefined) {
  return NOTE_COLORS.find(c => c.id === colorId) ?? NOTE_COLORS[0];
}

export function NotesTab() {
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const { data: notes = [], isLoading } = useListNotes(
    dateFilter ? { date: format(dateFilter, 'yyyy-MM-dd') } : undefined
  );
  
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const activeNote = notes.find(n => n.id === activeNoteId);

  // ── Auto-save: title + content ───────────────────────────────────────────────
  const [localTitle, setLocalTitle] = useState("");
  const [localContent, setLocalContent] = useState("");
  const [localColor, setLocalColor] = useState<NoteColorId>("default");
  const updateNoteMutate = useRef(updateNote.mutate);
  updateNoteMutate.current = updateNote.mutate;

  const lastSaved = useRef({ title: "", content: "", color: "default" as NoteColorId });

  useEffect(() => {
    if (activeNote) {
      setLocalTitle(activeNote.title);
      setLocalContent(activeNote.content);
      const c = (activeNote.color ?? "default") as NoteColorId;
      setLocalColor(c);
      lastSaved.current = { title: activeNote.title, content: activeNote.content, color: c };
    } else {
      setLocalTitle("");
      setLocalContent("");
      setLocalColor("default");
      lastSaved.current = { title: "", content: "", color: "default" };
    }
  }, [activeNote?.id]);

  useEffect(() => {
    if (!activeNoteId) return;
    const t = setTimeout(() => {
      const changed =
        localTitle !== lastSaved.current.title ||
        localContent !== lastSaved.current.content ||
        localColor !== lastSaved.current.color;
      if (changed) {
        updateNoteMutate.current({
          id: activeNoteId,
          data: {
            title: localTitle,
            content: localContent,
            color: localColor === "default" ? null : localColor,
          }
        }, {
          onSuccess: () => {
            lastSaved.current = { title: localTitle, content: localContent, color: localColor };
            queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
          }
        });
      }
    }, 800);
    return () => clearTimeout(t);
  }, [localTitle, localContent, localColor, activeNoteId, queryClient]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleCreate = () => {
    const newDate = format(new Date(), 'yyyy-MM-dd');
    createNote.mutate({
      data: { title: "Untitled Note", content: "", date: newDate }
    }, {
      onSuccess: (newNote) => {
        earnPoints();
        setDateFilter(undefined);
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
        setActiveNoteId(newNote.id);
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteNote.mutate({ id }, {
      onSuccess: () => {
        if (activeNoteId === id) setActiveNoteId(null);
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      }
    });
  };

  const handleColorChange = (colorId: NoteColorId) => {
    setLocalColor(colorId);
    // save immediately on color change (don't wait for debounce)
    if (!activeNoteId) return;
    updateNoteMutate.current({
      id: activeNoteId,
      data: { color: colorId === "default" ? null : colorId }
    }, {
      onSuccess: () => {
        lastSaved.current.color = colorId;
        queryClient.invalidateQueries({ queryKey: getListNotesQueryKey() });
      }
    });
  };

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const editorColor = getColorConfig(localColor);

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[500px] gap-6">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className={cn(
        "flex flex-col w-full md:w-1/3 md:max-w-[320px] gap-4 border-r md:pr-6 border-border/50",
        activeNoteId !== null && "hidden md:flex"
      )}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-serif text-foreground">Notebook</h2>
          <Button size="icon" variant="ghost" onClick={handleCreate} className="h-8 w-8 text-primary hover:bg-primary/10">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-xl bg-background border-border/60 h-10"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className={cn("shrink-0 rounded-xl h-10 w-10", dateFilter && "border-primary text-primary bg-primary/5")}>
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl" align="end">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={(d) => setDateFilter(d)}
                initialFocus
              />
              {dateFilter && (
                <div className="p-2 border-t border-border/50">
                  <Button variant="ghost" className="w-full text-xs h-8" onClick={() => setDateFilter(undefined)}>
                    Clear Filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pb-4">
          {isLoading ? (
            [1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {dateFilter ? "No notes on this date." : "No notes found."}
            </div>
          ) : (
            filteredNotes.map(note => {
              const cc = getColorConfig(note.color);
              return (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={cn(
                    "group relative p-4 rounded-xl border transition-all cursor-pointer text-left",
                    activeNoteId === note.id
                      ? "shadow-sm ring-1 ring-primary/30"
                      : "hover:shadow-sm",
                    cc.bg || "bg-background",
                    cc.border || (activeNoteId === note.id ? "border-primary/20" : "border-transparent hover:border-border/60"),
                  )}
                >
                  {/* color indicator strip */}
                  {cc.id !== "default" && (
                    <span className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-full", cc.dot)} />
                  )}
                  <div className={cc.id !== "default" ? "pl-3" : ""}>
                    <h4 className="font-medium text-foreground line-clamp-1 pr-6">{note.title || "Untitled Note"}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{note.content || "No content"}</p>
                    <div className="text-[10px] text-muted-foreground/60 mt-2">
                      {format(new Date(note.date), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(e, note.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 h-6 w-6 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Editor ──────────────────────────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col h-full",
        activeNoteId === null && "hidden md:flex items-center justify-center text-center bg-muted/20 rounded-3xl border border-dashed border-border/60"
      )}>
        {activeNoteId === null ? (
          <div className="flex flex-col items-center opacity-70">
            <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">Select a note</h3>
            <p className="text-muted-foreground max-w-[250px] mt-2 text-sm">Choose a note from the list or create a new one.</p>
            <Button onClick={handleCreate} variant="outline" className="mt-6 rounded-xl">
              Create Note
            </Button>
          </div>
        ) : (
          <div className={cn(
            "flex flex-col h-full rounded-3xl border p-6 md:p-8 shadow-sm transition-colors",
            editorColor.bg || "bg-background",
            editorColor.border || "border-border/60",
          )}>
            {/* Mobile back button */}
            <div className="flex items-center justify-between mb-4 md:hidden">
              <Button variant="ghost" size="sm" onClick={() => setActiveNoteId(null)} className="-ml-2">
                ← Back
              </Button>
            </div>

            {/* Title row + color picker */}
            <div className="flex items-start gap-3 mb-2">
              <Input
                value={localTitle}
                onChange={e => setLocalTitle(e.target.value)}
                className="flex-1 text-2xl md:text-3xl font-serif font-medium border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50 h-auto rounded-none bg-transparent"
                placeholder="Note Title"
              />

              {/* Color picker popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0 mt-1 h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-3 rounded-2xl">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Note color</p>
                  <div className="flex gap-2 flex-wrap max-w-[180px]">
                    {NOTE_COLORS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleColorChange(c.id)}
                        title={c.label}
                        className={cn(
                          "h-7 w-7 rounded-full border-2 transition-all",
                          c.dot,
                          localColor === c.id ? "border-foreground scale-110 shadow" : "border-transparent hover:scale-105",
                          c.id === "default" && "bg-muted-foreground/20"
                        )}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="text-xs text-muted-foreground mb-6 pb-4 border-b border-black/10">
              {activeNote && format(new Date(activeNote.date), 'EEEE, MMMM do yyyy')}
            </div>

            <Textarea
              value={localContent}
              onChange={e => setLocalContent(e.target.value)}
              className="flex-1 resize-none border-none shadow-none px-0 focus-visible:ring-0 text-base leading-relaxed placeholder:text-muted-foreground/50 bg-transparent"
              placeholder="Start typing your notes here..."
            />
          </div>
        )}
      </div>

    </div>
  );
}
