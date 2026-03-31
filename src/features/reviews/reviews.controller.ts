import {
  Controller, Get, Post, Param, Query, ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PaginationDto } from 'src/infrastructure/dto/pagination.dto';
import { User } from 'src/domain/user.entity';
import { CurrentUser } from 'src/infrastructure/decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';


@Controller('v1')
@UseGuards(AuthGuard('github'))
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // GET /api/v1/repositories/:repoId/reviews
  @Get('repositories/:repoId/reviews')
  async getRepositoryReviews(
    @Param('repoId', ParseUUIDPipe) repoId: string,
    @CurrentUser() user: User,
    @Query() pagination: PaginationDto,
    @Query('author') author?: string,
    @Query('minScore') minScore?: number,
    @Query('maxScore') maxScore?: number,
  ) {
    const result = await this.reviewsService.getRepositoryReviews(
      repoId,
      user,
      pagination,
      { authorLogin: author, minScore, maxScore },
    );

    return {
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    };
  }

  // GET /api/v1/reviews/:reviewId
  @Get('reviews/:reviewId')
  async getReviewDetail(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentUser() user: User,
  ) {
    const review = await this.reviewsService.getReviewDetail(reviewId, user);
    return { data: review };
  }

  // POST /api/v1/reviews/:reviewId/rereview
  @Post('reviews/:reviewId/rereview')
  async triggerRereview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentUser() user: User,
  ) {
    const result = await this.reviewsService.triggerRereview(reviewId, user);
    return { data: result };
  }

  // GET /api/v1/pull-requests/:prId/reviews
  @Get('pull-requests/:prId/reviews')
  async getPullRequestReviews(
    @Param('prId', ParseUUIDPipe) prId: string,
    @CurrentUser() user: User,
  ) {
    const reviews = await this.reviewsService.getPullRequestReviews(prId, user);
    return { data: reviews, meta: { total: reviews.length } };
  }
}