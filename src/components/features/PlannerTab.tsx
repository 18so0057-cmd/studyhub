import { useState, useMemo } from "react";
import { 
  useListPlannerTasks, 
  useCreatePlannerTask, 
  useUpdatePlannerTask, 
  useDeletePlannerTask, 
  getListPlannerTasksQueryKey 
} from "@workspace/api-client-react";
import { earnPoints } from "@/hooks/usePoints";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Plus, Trash2, AlignLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.date({ required_error: "Date is required" }),
  description: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export function PlannerTab() {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useListPlannerTasks();
  const createTask = useCreatePlannerTask();
  const updateTask = useUpdatePlannerTask();
  const deleteTask = useDeletePlannerTask();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      date: new Date(),
      description: "",
    }
  });

  const groupedTasks = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    tasks.forEach(task => {
      const existing = map.get(task.date) || [];
      map.set(task.date, [...existing, task]);
    });
    return Array.from(map.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  }, [tasks]);

  const onSubmit = (data: TaskFormValues) => {
    createTask.mutate({ 
      data: { 
        title: data.title, 
        description: data.description || undefined, 
        date: format(data.date, 'yyyy-MM-dd') 
      } 
    }, {
      onSuccess: () => {
        earnPoints();
        reset();
        setIsDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: getListPlannerTasksQueryKey() });
      }
    });
  };

  const handleToggle = (id: number, currentStatus: boolean) => {
    updateTask.mutate({ id, data: { completed: !currentStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlannerTasksQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPlannerTasksQueryKey() });
      }
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif text-foreground">Study Planner</h2>
          <p className="text-muted-foreground mt-1">Organize your assignments and deadlines.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-sm gap-2 px-5">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-serif">New Planned Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Task Title</label>
                <Input 
                  placeholder="e.g. Read Chapter 4" 
                  {...register("title")}
                  className="rounded-xl"
                  autoFocus
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date</label>
                <Controller
                  control={control}
                  name="date"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl", !field.value && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(d) => d && field.onChange(d)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Notes (Optional)</label>
                <Textarea 
                  placeholder="Additional context or links..." 
                  {...register("description")}
                  className="rounded-xl resize-none h-24"
                />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={createTask.isPending}>
                Create Task
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1,2].map(i => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-32 bg-muted animate-pulse rounded-md" />
              <div className="h-20 bg-muted/50 animate-pulse rounded-xl" />
              <div className="h-20 bg-muted/50 animate-pulse rounded-xl" />
            </div>
          ))}
        </div>
      ) : groupedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <CalendarIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">No upcoming tasks</h3>
          <p className="text-muted-foreground max-w-sm mt-2">Your planner is clear. Add assignments or upcoming exams to stay on track.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedTasks.map(([date, dateTasks]) => (
            <div key={date} className="space-y-4">
              <h3 className="font-serif text-lg text-primary flex items-center gap-2 border-b border-border/50 pb-2">
                <CalendarIcon className="h-4 w-4" />
                {format(parseISO(date), 'EEEE, MMMM d')}
              </h3>
              <div className="grid gap-3">
                <AnimatePresence initial={false}>
                  {dateTasks.map(task => (
                    <motion.div 
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        "group relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200",
                        task.completed 
                          ? "bg-muted/40 border-transparent" 
                          : "bg-background border-border/80 shadow-sm hover:shadow-md"
                      )}
                    >
                      <Checkbox 
                        checked={task.completed} 
                        onCheckedChange={() => handleToggle(task.id, task.completed)}
                        className="mt-1 h-5 w-5 rounded-md data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                      />
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <span className={cn(
                          "font-medium text-base transition-colors", 
                          task.completed ? "line-through text-muted-foreground/70" : "text-foreground"
                        )}>
                          {task.title}
                        </span>
                        {task.description && (
                          <span className={cn(
                            "text-sm flex items-start gap-1.5 mt-0.5",
                            task.completed ? "text-muted-foreground/50" : "text-muted-foreground"
                          )}>
                            <AlignLeft className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-70" />
                            <span className="line-clamp-2">{task.description}</span>
                          </span>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(task.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mt-1 -mr-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
