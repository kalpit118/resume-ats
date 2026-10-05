export interface ExportRequest {
  resumeContent: any; // Structured resume data
  template: string;
  options?: any;
}

export interface Exporter {
  export(request: ExportRequest): Promise<Buffer | string>;
}
