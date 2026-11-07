import path from 'path';

export function getUploadsDirectory(): string {
  return path.join(process.cwd(), 'public', 'uploads');
}
