export interface NavSection {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

export interface EndpointProps {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  authNote?: string;
  requestBody?: { field: string; type: string; required: boolean; description: string }[];
  queryParams?: { field: string; type: string; required: boolean; description: string }[];
  responseExample: string;
  curlExample: string;
  jsExample: string;
}
