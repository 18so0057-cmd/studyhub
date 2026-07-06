import { useGetSummary } from "@workspace/api-client-react";
import { BookOpen, CheckCircle2, Calendar, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePoints } from "@/hooks/usePoints";

export function SummaryHeader() {
  const { data: summary, isLoading } = useGetSummary();
  const points = usePoints();

  return (
    <header className="flex flex-col gap-6 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-sm">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-medium text-foreground tracking-tight">StudyHub</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Your quiet place to focus</p>
          </div>
        </div>

        {/* Points badge */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-2xl shadow-sm">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="text-sm font-semibold">{points} pts</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard 
          icon={<Calendar className="h-4 w-4 text-primary" />} 
          label="Planner" 
          value={isLoading ? null : `${summary?.completedPlannerTasks ?? 0}/${summary?.totalPlannerTasks ?? 0}`} 
        />
        <StatCard 
          icon={<CheckCircle2 className="h-4 w-4 text-primary" />} 
          label="To-Dos" 
          value={isLoading ? null : `${summary?.completedTodos ?? 0}/${summary?.totalTodos ?? 0}`} 
        />
        <StatCard 
          icon={<BookOpen className="h-4 w-4 text-primary" />} 
          label="Notes" 
          value={isLoading ? null : summary?.totalNotes ?? 0} 
        />
      </div>
    </header>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number | null }) {
  return (
    <div className="bg-card/50 border border-border/60 rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-colors hover:bg-card">
      <div className="h-10 w-10 bg-muted/60 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        {value === null ? (
          <Skeleton className="h-6 w-12 mt-1 rounded-md" />
        ) : (
          <span className="text-lg font-semibold tracking-tight text-foreground">{value}</span>
        )}
      </div>
    </div>
  );
}
