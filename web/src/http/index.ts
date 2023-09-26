const BASE_URL = import.meta.env.BASE_URL

interface Result<T> {
  code: number
  mgs: string
  data: T
}

export class BusinessError extends Error {
  private readonly code: number
  constructor(message: string, code: number) {
    super(message)
    this.name = 'BusinessError'
    this.code = code
  }

  public getCode(): number {
    return this.code
  }
}

export async function request<T = any>(endpoint: string, options?: RequestInit) {
  const url = `${BASE_URL}${endpoint}`
  try {
    const response = await fetch(url, options)
    if (response.ok) {
      const result: Result<T> = await response.json()
      if (result.code === 200)
        return result.data

      else
        return Promise.reject(new BusinessError(result.mgs, result.code))
    }
    else {
      return Promise.reject(new Error(response.statusText))
    }
  }
  catch (e) {
    return Promise.reject(e)
  }
}
