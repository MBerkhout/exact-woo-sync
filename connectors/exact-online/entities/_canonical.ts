/** Helpers shared by Exact OData entity modules. */

export function jsonReadHeaders(): Headers {
  const h = new Headers();
  h.set("Accept", "application/json");
  return h;
}

export function jsonWriteHeaders(): Headers {
  const h = jsonReadHeaders();
  h.set("Content-Type", "application/json");
  return h;
}

/** OData key segment `Entity(guid'...')` with basic quoting. */
export function odataGuidKey(resourcePath: string, id: string): string {
  const safe = id.replace(/'/g, "''");
  return `${resourcePath}(guid'${safe}')`;
}

export async function readODataRecord<T>(res: Response): Promise<T | null> {
  if (res.status === 404) return null;
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Exact OData error (${res.status}): ${t}`);
  }
  const json = (await res.json()) as { d?: T };
  return json.d ?? null;
}

export async function readODataCreate<T>(res: Response): Promise<T> {
  if (!(res.status === 201 || res.status === 200)) {
    const t = await res.text();
    throw new Error(`Exact OData create failed (${res.status}): ${t}`);
  }
  const json = (await res.json()) as { d?: T };
  if (!json.d) throw new Error("Exact OData create response missing d");
  return json.d;
}

export async function readODataUpdate<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Exact OData update failed (${res.status}): ${t}`);
  }
  if (res.status === 204) return {} as T;
  const json = (await res.json()) as { d?: T };
  return json.d ?? ({} as T);
}
