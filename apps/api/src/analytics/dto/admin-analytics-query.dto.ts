import { IsDateString } from 'class-validator';

export class AdminAnalyticsQueryDto {
  @IsDateString({ strict: true })
  from!: string;

  @IsDateString({ strict: true })
  to!: string;
}
