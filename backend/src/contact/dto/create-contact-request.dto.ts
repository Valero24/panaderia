import { IsEmail, IsIn, IsString, MinLength } from "class-validator";

export class CreateContactRequestDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  whatsapp!: string;

  @IsString()
  @MinLength(3)
  subject!: string;

  @IsString()
  @MinLength(10)
  message!: string;

  @IsIn(["alojamiento", "experiencia", "paquete", "evento especial", "otro"])
  interestType!: string;
}
