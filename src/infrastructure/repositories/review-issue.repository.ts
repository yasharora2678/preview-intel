import { Injectable } from "@nestjs/common";
import { ReviewIssue } from "src/domain/review-issue.entity";
import { DataSource, Repository } from "typeorm";

@Injectable()
export class ReviewIssueRepository extends Repository<ReviewIssue> {
  constructor(dataSource: DataSource) {
    super(ReviewIssue, dataSource.createEntityManager());
  }
}