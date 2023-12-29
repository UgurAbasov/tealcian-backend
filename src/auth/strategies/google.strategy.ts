import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";

export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor() {
        super({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: 'http://localhost:4000/auth/google-redirect',
            scope: ['email', 'profile'],
        })
    }
    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: VerifyCallback,
      ): Promise<any> {
        done(null, profile)
        return profile
      }
}