export interface PrFile {
  filename: string;
  patch?: string;
  status: string;
}

export interface ReviewComment {
  path: string;
  position: number;
  body: string;
}

export interface AiReview {
  summary: string;
  comments: ReviewComment[];
}
