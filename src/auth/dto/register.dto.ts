import {IsNotEmpty, IsString, MinLength} from "class-validator"

export class RegisterDto{
    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    username:string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    password : string
}