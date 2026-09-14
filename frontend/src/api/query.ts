import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { apiFetch } from "@/src/api/client";

export function useApi<T>(key: any[], path: string, options?: Partial<UseQueryOptions<T>>) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => apiFetch<T>(path),
    ...(options as any),
  });
}
