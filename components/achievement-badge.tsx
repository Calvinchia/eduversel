import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface AchievementBadgeProps {
  name: string
  icon: string
  points: number
  earnedAt?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function AchievementBadge({ name, icon, points, earnedAt, size = "md", className }: AchievementBadgeProps) {
  const sizeClasses = {
    sm: "text-xs p-2",
    md: "text-sm p-3",
    lg: "text-base p-4",
  }

  const iconSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg",
        sizeClasses[size],
        className,
      )}
    >
      <div className={cn("flex-shrink-0", iconSizes[size])}>{icon}</div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            +{points} points
          </Badge>
          {earnedAt && <span className="text-xs text-gray-500">{new Date(earnedAt).toLocaleDateString()}</span>}
        </div>
      </div>
    </div>
  )
}
