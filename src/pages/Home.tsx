import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlannerTab } from "@/components/features/PlannerTab";
import { TodoTab } from "@/components/features/TodoTab";
import { NotesTab } from "@/components/features/NotesTab";
import { PomodoroTab } from "@/components/features/PomodoroTab";
import { SummaryHeader } from "@/components/features/SummaryHeader";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-background font-sans text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-12 flex flex-col gap-8">
        <SummaryHeader />
        
        <Tabs defaultValue="planner" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1.5 rounded-2xl">
            <TabsTrigger value="planner" className="rounded-xl py-2 font-medium transition-all data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary">
              Planner
            </TabsTrigger>
            <TabsTrigger value="todo" className="rounded-xl py-2 font-medium transition-all data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary">
              To-Do List
            </TabsTrigger>
            <TabsTrigger value="notes" className="rounded-xl py-2 font-medium transition-all data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary">
              Notes
            </TabsTrigger>
            <TabsTrigger value="pomodoro" className="rounded-xl py-2 font-medium transition-all data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary">
              🍅 Timer
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-8 bg-card border border-border/50 rounded-3xl p-6 md:p-8 shadow-sm min-h-[500px]">
            <TabsContent value="planner" className="m-0 outline-none">
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <PlannerTab />
              </motion.div>
            </TabsContent>
            <TabsContent value="todo" className="m-0 outline-none">
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <TodoTab />
              </motion.div>
            </TabsContent>
            <TabsContent value="notes" className="m-0 outline-none">
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <NotesTab />
              </motion.div>
            </TabsContent>
            <TabsContent value="pomodoro" className="m-0 outline-none">
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <PomodoroTab />
              </motion.div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
