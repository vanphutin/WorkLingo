import {ApiProperty,ApiPropertyOptional} from '@nestjs/swagger';
import {IsInt,IsObject,IsOptional,IsString,MaxLength,Min,ValidateIf} from 'class-validator';
import type {BeginnerTarget} from '@worklingo/contracts';
export class BeginnerTargetDto{
 @ApiProperty() @IsObject() target!:BeginnerTarget;
}
export class BeginnerCommandDto extends BeginnerTargetDto{
 @ApiProperty({nullable:true}) @ValidateIf((_o,v:unknown)=>v!==null) @IsInt() @Min(1) expectedRevision!:number|null;
 @ApiProperty() @IsString() @MaxLength(100) idempotencyKey!:string;
 @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500000) rawSource?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() editorialCode?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() expectedSourceHash?:string;
 @ApiPropertyOptional() @IsOptional() @IsString() reviewHash?:string;
 @ApiPropertyOptional() @IsOptional() @IsObject() selectedAudioArtifacts?:Record<string,string>;
}
export class BeginnerNestedCommandDto extends BeginnerTargetDto{
 @ApiProperty() @IsObject() command!:Record<string,unknown>;
}
