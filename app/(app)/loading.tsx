export default function AppLoading() {
  return (
    <div className="space-y-5" aria-live="polite" aria-busy="true">
      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="h-1 w-full overflow-hidden bg-slate-200/70">
          <div className="route-loading-bar h-full w-1/3 rounded-full bg-slate-950" />
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="h-10 w-full max-w-md animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-200" />
          <div className="flex flex-wrap gap-3 pt-2">
            <div className="h-11 w-40 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-11 w-32 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
          <div className="h-5 w-44 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-2 h-4 w-full max-w-lg animate-pulse rounded-full bg-slate-200" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4"
              >
                <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="h-7 w-16 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
            <div className="h-5 w-36 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-2 h-4 w-full max-w-sm animate-pulse rounded-full bg-slate-200" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
                  <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-slate-200" />
                  <div className="mt-2 h-3 w-3/4 animate-pulse rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
            <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded-full bg-slate-200" />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3"
                >
                  <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-8 w-20 animate-pulse rounded-2xl bg-slate-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
