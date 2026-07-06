import { userRepository } from '../repositories/userRepository';

export const userService = {
    async getUsersExcept(userId: number) {
        return await userRepository.getAllUsersExcept(userId);
    }
};
