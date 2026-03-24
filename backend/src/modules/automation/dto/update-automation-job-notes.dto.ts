import { IsString } from 'class-validator';

export class UpdateAutomationJobNotesDto {
  @IsString()
  notes!: string;
}
