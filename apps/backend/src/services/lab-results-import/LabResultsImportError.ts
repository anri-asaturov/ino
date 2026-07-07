export class LabResultsImportError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LabResultsImportError';
  }
}
