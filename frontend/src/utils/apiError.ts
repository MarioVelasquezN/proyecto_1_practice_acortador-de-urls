import { isAxiosError } from 'axios';

export function getApiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const msg = err.response?.data?.error as string | undefined;
    return msg ?? err.message ?? 'Error inesperado';
  }
  if (err instanceof Error) return err.message;
  return 'Error inesperado';
}

export function getApiErrorStatus(err: unknown): number | null {
  if (isAxiosError(err)) return err.response?.status ?? null;
  return null;
}
