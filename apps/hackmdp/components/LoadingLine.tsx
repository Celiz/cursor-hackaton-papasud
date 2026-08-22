import { cn } from "@/lib/utils"


export const LoadingLine = ({ loading = true }: { loading?: boolean }) => {
  return (
    <div className="relative overflow-hidden w-full h-px bg-border m-auto">
      <span
        className={cn(
          'absolute w-[80px] h-px ml-auto mr-auto left-0 right-0 text-center block top-0',
          'transition-all',
          'bg-purple-400 dark:line-loading-bg',
          loading && 'animate-line-loading-slower opacity-100',
          loading ? 'opacity-100' : 'opacity-0'
        )}
      ></span>
    </div>
  )
}
