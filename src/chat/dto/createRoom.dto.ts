export interface CreateRoomDto {
    users: Array<string>
    name: string,
    refreshToken: string
}