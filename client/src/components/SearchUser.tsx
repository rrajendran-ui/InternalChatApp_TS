import React, { useEffect, useState } from 'react';
import { IoSearchOutline, IoClose } from "react-icons/io5";
import Loading from './Loading';
import UserSearchCard from './UserSearchCard';
import axios from 'axios';
import toast from 'react-hot-toast';

/* ================= TYPES ================= */

interface User {
    _id: string;
    name: string;
    email: string;
    profile_pic: string;
}

interface SearchUserProps {
    onClose: () => void;
    currentUser: User;
}

/* ================= COMPONENT ================= */

const SearchUser: React.FC<SearchUserProps> = ({ onClose, currentUser }) => {

    const [search, setSearch] = useState<string>("");
    const [topicName, setTopicName] = useState<string>("");
    const [searchUser, setSearchUser] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([currentUser]); 
    const [loading, setLoading] = useState<boolean>(false);

    /* ================= SEARCH USERS ================= */

    useEffect(() => {
        if (!search.trim()) {
            setSearchUser([]);
            return;
        }

        const fetchUsers = async () => {
            try {
                setLoading(true);

                const res = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/search-user`,
                    { search }
                );

                setSearchUser(res.data.data as User[]);
            } catch (err: any) {
                toast.error(err?.response?.data?.message || "Search failed");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [search]);

    /* ================= SELECT USER ================= */

    const toggleSelectUser = (user: User) => {
        if (!user?._id) return;

        if (user._id === currentUser._id) return;

        const exists = selectedUsers.find(u => u._id === user._id);

        if (exists) {
            setSelectedUsers(prev => prev.filter(u => u._id !== user._id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    /* ================= CREATE GROUP ================= */

    const createGroupChat = async () => {

    if (!topicName.trim()) {
        toast.error("Enter Topic Name");
        return;
    }

    const participantIds = selectedUsers
        .map(u => u._id)
        .filter(id => id && id.length === 24);

    if (participantIds.length < 2) {
        toast.error("Select at least one user to create group");
        return;
    }

    try {
        await axios.post(
            `${import.meta.env.VITE_API_URL}/api/conversations`,
            {
                topic: topicName,
                participants: participantIds,
                currentUserId: currentUser._id
            },
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            }
        );

        toast.success("Group chat created!");
        onClose();
    } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to create group");
    }
};

    /* ================= UI ================= */

    return (
        <div className='fixed inset-0 bg-slate-700 bg-opacity-40 p-2 z-10'>
            <div className='w-full max-w-lg mx-auto mt-10'>

                {/* Search Input */}
                <div className='bg-white rounded h-14 overflow-hidden flex'>
                    <input
                        type='text'
                        placeholder='Search user by name, email...'
                        className='w-full outline-none py-1 px-4'
                        value={search}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSearch(e.target.value)
                        }
                    />
                    <div className='h-14 w-14 flex justify-center items-center'>
                        <IoSearchOutline size={25} />
                    </div>
                </div>

                {/* Topic Input */}
                <div className='bg-white rounded h-14 overflow-hidden flex mt-2'>
                    <input
                        type='text'
                        placeholder='Enter Topic Name'
                        className='w-full outline-none py-1 px-4'
                        value={topicName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setTopicName(e.target.value)
                        }
                    />
                </div>

                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                    <div className='bg-white mt-2 p-2 rounded flex flex-wrap gap-2'>
                        {selectedUsers.map(u => (
                            <div
                                key={u._id}
                                className='bg-primary text-white px-3 py-1 rounded flex items-center gap-1'
                            >
                                {u.name}
                                <span
                                    className='cursor-pointer'
                                    onClick={() => toggleSelectUser(u)}
                                >
                                    x
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Search Results */}
                <div className='bg-white mt-2 p-4 rounded max-h-80 overflow-y-auto'>
                    {loading && <Loading />}

                    {!loading && searchUser.length === 0 && (
                        <p className='text-center text-slate-500'>
                            No user found!
                        </p>
                    )}

                    {!loading && searchUser.map(u => (
                        <UserSearchCard
                            key={u._id}
                            user={u}
                            isSelected={!!selectedUsers.find(su => su._id === u._id)}
                            onClick={() => toggleSelectUser(u)}
                        />
                    ))}
                </div>

                <button
                    className='mt-4 w-full bg-primary text-white py-2 rounded font-semibold hover:bg-blue-600'
                    onClick={createGroupChat}
                >
                    Create Group Chat
                </button>
            </div>

            <div
                className='absolute top-0 right-0 text-2xl p-2 lg:text-4xl hover:text-white cursor-pointer'
                onClick={onClose}
            >
                <IoClose />
            </div>
        </div>
    );
};

export default SearchUser;