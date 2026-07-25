export async function readApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown };

    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
  } catch {
    // Response body was not JSON; use the fallback message.
  }

  if (response.status === 404) {
    return "We couldn’t find what you were looking for.";
  }

  if (response.status === 401) {
    return "Please select a demo user and try again.";
  }

  if (response.status === 403) {
    return "You don’t have permission to do that.";
  }

  if (response.status >= 500) {
    return "Something went wrong on the server. Please try again.";
  }

  return fallback;
}
