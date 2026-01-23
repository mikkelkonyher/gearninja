/**
 * Extracts the actual error message from a Supabase Edge Function error response.
 * Edge Functions return errors in the format { error: "message" } but Supabase
 * wraps this in a way that makes it hard to access. This function tries multiple
 * strategies to extract the actual error message.
 */
export async function extractEdgeFunctionError(
  error: any,
  data?: any
): Promise<string> {
  // Default error message
  const defaultMessage = "Der skete en fejl";

  // Strategy 1: Check if data contains error message (Edge Function returns { error: "message" })
  if (data && typeof data === 'object') {
    if ('error' in data && typeof data.error === 'string') {
      return data.error;
    }
    if ('message' in data && typeof data.message === 'string') {
      return data.message;
    }
  }

  // Strategy 2: For FunctionsHttpError, try to parse error.context as JSON
  // This is the most reliable way to get the error message from Edge Functions
  if (error?.context) {
    try {
      // If context has a json() method (Response object), call it
      if (typeof error.context.json === 'function') {
        const errorBody = await error.context.json();
        if (errorBody?.error && typeof errorBody.error === 'string') {
          return errorBody.error;
        }
        if (errorBody?.message && typeof errorBody.message === 'string') {
          return errorBody.message;
        }
      }
      // If context is already an object, use it directly
      else if (typeof error.context === 'object') {
        if (error.context?.error && typeof error.context.error === 'string') {
          return error.context.error;
        }
        if (error.context?.message && typeof error.context.message === 'string') {
          return error.context.message;
        }
      }
      // If context is a string, try to parse it
      else if (typeof error.context === 'string') {
        const errorBody = JSON.parse(error.context);
        if (errorBody?.error && typeof errorBody.error === 'string') {
          return errorBody.error;
        }
        if (errorBody?.message && typeof errorBody.message === 'string') {
          return errorBody.message;
        }
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: Check error.message if it's not the generic "non-2xx" message
  if (error?.message && 
      typeof error.message === 'string' && 
      !error.message.includes("non-2xx") && 
      !error.message.includes("Edge Function returned")) {
    return error.message;
  }

  // Strategy 4: Try to parse error as JSON if it's a string
  if (typeof error === 'string') {
    try {
      const parsed = JSON.parse(error);
      if (parsed?.error && typeof parsed.error === 'string') {
        return parsed.error;
      }
      if (parsed?.message && typeof parsed.message === 'string') {
        return parsed.message;
      }
    } catch {
      // Not JSON, continue
    }
  }

  // Strategy 5: Check if error itself has an error property
  if (error?.error && typeof error.error === 'string') {
    return error.error;
  }

  return defaultMessage;
}

