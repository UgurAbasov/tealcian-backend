import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-github2";

export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
    constructor() {
        super({
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: 'http://localhost:4000/auth/github-redirect',
            scope: ['user'],
        })
    }
    async validate(
        accessToken: string,
        refreshToken: string,
        profile: any
      ): Promise<any> {
        return profile
      }
}