import React from 'react'
import Avatar from './Avatar'
import type { IUser } from '../redux/types'

interface UserSearchCardProps {
  user: IUser
  isSelected?: boolean
  onClick?: () => void
}

const UserSearchCard: React.FC<UserSearchCardProps> = ({
  user,
  isSelected = false,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-2 rounded cursor-pointer border ${
        isSelected
          ? 'border-primary bg-slate-100'
          : 'border-transparent hover:bg-slate-50'
      }`}
    >
      <Avatar
        name={user.name}
        imageUrl={user.profile_pic}
        userId={user._id}
        width={40}
        height={40}
      />

      <div className='flex-1'>
        <h3 className='font-semibold text-sm'>{user.name}</h3>
        <p className='text-xs text-slate-500'>{user.email}</p>
      </div>

      {isSelected && (
        <span className='text-primary font-bold px-2'>✓</span>
      )}
    </div>
  )
}

export default UserSearchCard