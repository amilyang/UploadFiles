import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Ref, ComputedRef } from 'vue';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref<User | null>(null);
  const token = ref<string>('');
  const isAuthenticated = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 计算属性
  const isAdmin: ComputedRef<boolean> = computed(() => user.value?.role === 'admin');

  const userInitials: ComputedRef<string> = computed(() => {
    if (!user.value) return '';
    const names = user.value.username.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.value.username.substring(0, 2).toUpperCase();
  });

  // Actions
  const setUser = (userData: User) => {
    user.value = userData;
    isAuthenticated.value = true;
    saveToStorage();
  };

  const setToken = (accessToken: string) => {
    token.value = accessToken;
    saveToStorage();
  };

  const setAuth = (userData: User, accessToken: string) => {
    user.value = userData;
    token.value = accessToken;
    isAuthenticated.value = true;
    saveToStorage();
  };

  const clearAuth = () => {
    user.value = null;
    token.value = '';
    isAuthenticated.value = false;
    error.value = null;
    removeFromStorage();
  };

  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage;
  };

  const clearError = () => {
    error.value = null;
  };

  const updateUser = (updates: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...updates };
      saveToStorage();
    }
  };

  // 模拟登录
  const login = async (username: string, password: string): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // 这里应该是实际的API调用
      // 模拟API延迟
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 模拟成功登录
      const mockUser: User = {
        id: '1',
        username,
        email: `${username}@example.com`,
        role: username === 'admin' ? 'admin' : 'user',
        createdAt: new Date(),
      };

      const mockToken = `mock-token-${Date.now()}`;

      setAuth(mockUser, mockToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 模拟注册
  const register = async (username: string, email: string, password: string): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // 这里应该是实际的API调用
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockUser: User = {
        id: Date.now().toString(),
        username,
        email,
        role: 'user',
        createdAt: new Date(),
      };

      const mockToken = `mock-token-${Date.now()}`;

      setAuth(mockUser, mockToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const logout = async (): Promise<void> => {
    setLoading(true);

    try {
      // 这里应该调用API使token失效
      await new Promise((resolve) => setTimeout(resolve, 500));
      clearAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 刷新token
  const refreshToken = async (): Promise<void> => {
    if (!token.value) return;

    setLoading(true);

    try {
      // 这里应该调用API刷新token
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 模拟刷新成功
      const newToken = `mock-token-${Date.now()}`;
      setToken(newToken);
    } catch (err) {
      clearAuth();
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 从localStorage恢复
  const restoreFromStorage = (): void => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');

      if (storedUser && storedToken) {
        user.value = JSON.parse(storedUser);
        token.value = storedToken;
        isAuthenticated.value = true;
      }
    } catch (err) {
      console.error('Failed to restore from storage:', err);
      clearAuth();
    }
  };

  // 保存到localStorage
  const saveToStorage = (): void => {
    try {
      if (user.value) {
        localStorage.setItem('user', JSON.stringify(user.value));
      }
      if (token.value) {
        localStorage.setItem('token', token.value);
      }
    } catch (err) {
      console.error('Failed to save to storage:', err);
    }
  };

  // 从localStorage移除
  const removeFromStorage = (): void => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } catch (err) {
      console.error('Failed to remove from storage:', err);
    }
  };

  // 检查权限
  const hasPermission = (permission: string): boolean => {
    if (!user.value) return false;

    // 管理员拥有所有权限
    if (user.value.role === 'admin') return true;

    // 这里可以添加更复杂的权限检查逻辑
    const permissions: Record<string, string[]> = {
      user: ['upload', 'download', 'view'],
      admin: ['upload', 'download', 'view', 'delete', 'manage'],
    };

    return permissions[user.value.role]?.includes(permission) || false;
  };

  // 重置状态
  const reset = () => {
    clearAuth();
  };

  return {
    // 状态
    user,
    token,
    isAuthenticated,
    isLoading,
    error,

    // 计算属性
    isAdmin,
    userInitials,

    // Actions
    setUser,
    setToken,
    setAuth,
    clearAuth,
    setLoading,
    setError,
    clearError,
    updateUser,
    login,
    register,
    logout,
    refreshToken,
    restoreFromStorage,
    hasPermission,
    reset,
  };
});
