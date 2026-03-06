export interface User {
  _id: string
  name: string
  email: string
  profile_pic: string
  createdAt: string
  updatedAt: string
}

export type SearchUser = Pick<User, '_id' | 'name' | 'email' | 'profile_pic'>