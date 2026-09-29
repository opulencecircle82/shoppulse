/** The owner's header branch switcher. "MAIN" stands for `branch_id is null` (a real branch id can't be null). */
export type BranchFilterValue = "ALL" | "MAIN" | (string & {});

export function matchesBranchFilter(branchId: string | null, filter: BranchFilterValue): boolean {
  if (filter === "ALL") return true;
  if (filter === "MAIN") return branchId === null;
  return branchId === filter;
}
