import { useListTodos, useCreateTodo, useUpdateTodo, useDeleteTodo, getListTodosQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const todoSchema = z.object({
  title: z.string().min(1, "Title cannot be empty"),
});

type TodoFormValues = z.infer<typeof todoSchema>;

export function TodoTab() {
  const queryClient = useQueryClient();
  const { data: todos = [], isLoading } = useListTodos();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  
  const { register, handleSubmit, reset } = useForm<TodoFormValues>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: "" }
  });

  const onSubmit = (data: TodoFormValues) => {
    createTodo.mutate({ data: { title: data.title } }, {
      onSuccess: () => {
        reset();
        queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      }
    });
  };

  const handleToggle = (id: number, currentStatus: boolean) => {
    updateTodo.mutate({ id, data: { completed: !currentStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteTodo.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTodosQueryKey() });
      }
    });
  };

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed === b.completed) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.completed ? 1 : -1;
  });

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <div className="flex flex-col items-center text-center pb-2">
        <h2 className="text-2xl font-serif text-foreground">Today's Focus</h2>
        <p className="text-muted-foreground mt-1">{format(new Date(), 'EEEE, MMMM do')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="relative flex items-center">
        <Input 
          placeholder="What needs to get done?" 
          {...register("title")}
          className="pr-14 bg-background shadow-sm border-border/80 text-base py-6 rounded-2xl focus-visible:ring-primary/50"
        />
        <Button 
          type="submit" 
          size="icon" 
          className="absolute right-2 h-10 w-10 rounded-xl" 
          disabled={createTodo.isPending}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </form>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)
        ) : (
          <AnimatePresence initial={false}>
            {sortedTodos.map(todo => (
              <motion.div 
                key={todo.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "group flex items-center gap-4 p-4 rounded-2xl border transition-colors",
                  todo.completed ? 'bg-muted/30 border-transparent' : 'bg-background border-border/80 shadow-sm hover:shadow-md'
                )}
              >
                <Checkbox 
                  checked={todo.completed} 
                  onCheckedChange={() => handleToggle(todo.id, todo.completed)} 
                  className="h-5 w-5 rounded-md border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className={cn(
                  "flex-1 text-base transition-all", 
                  todo.completed ? 'line-through text-muted-foreground/60' : 'text-foreground'
                )}>
                  {todo.title}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(todo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        
        {!isLoading && todos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-70">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">Your list is clear.</p>
            <p className="text-sm text-muted-foreground mt-1">Take a deep breath.</p>
          </div>
        )}
      </div>
    </div>
  );
}
