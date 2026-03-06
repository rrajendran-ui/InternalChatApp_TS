/**
 * User interface based on server UserModel
 */

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  profile_pic: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Message interface based on server messageSchema in ConversationModel
 */
export interface IMessage {
  _id: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  fileName?: string;  
  fileUrl?: string;
  seen: boolean;
  sender: IUser | string;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversation interface based on server ConversationModel
 */
export interface IConversation {
  _id: string;
  topic: string;
  participants: IUser[];
  lastMessage?: IMessage;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
/**
 * Sidebar conversation summary (matches socket sidebar response)
 */
export interface IConversationSummary {
  _id: string;
  topic: string;
  topicImage?: string;
  lastMessage?: IMessage;
  unseenMsg: number;
}

export interface UserSearchCardProps {
  user: IUser
  isSelected?: boolean
  onClick?: () => void
}

export interface ITopic {
  _id: string;
  name: string;
  profile_pic: string;
}