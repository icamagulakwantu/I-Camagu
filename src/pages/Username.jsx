import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function Username() {
      const [username, setUsernameInput] = useState('')
        const [error, setError] = useState('')
          const [loading, setLoading] = useState(false)

            const { accessToken, updateUser } = useAuth()

              const handleSubmit = async (e) => {
                      e.preventDefault()
                          setError('')
                              setLoading(true)
                                  try {
                                            const res = await fetch('/api/user/username', {
                                                        method: 'POST',
                                                                headers: {
                                                                              'Content-Type': 'application/json',
                                                                                        Authorization: `Bearer ${accessToken}`,
                                                                },
                                                                        body: JSON.stringify({ username }),
                                            })
                                                  const data = await res.json()
                                                        if (!res.ok) throw new Error(data.error || 'Could not set username')
                                                              updateUser({ username: data.username })
                                  } catch (err) {
                                            setError(err.message)
                                  } finally {
                                            setLoading(false)
                                  }
              }

                return (
                        <div className="icamagu-bg flex flex-col items-center justify-center px-6 py-10">
                              <div className="w-full max-w-sm bg-white border-3 border-brand-black rounded-soft p-8">
                                      <div className="h-1.5 w-16 bg-brand-ochre rounded-pill mb-6"></div>
                                              <h2 className="text-2xl font-extrabold text-brand-black mb-2">
                                                        One last thing
                                                                </h2>
                                                                        <p className="text-brand-black/60 text-sm mb-6">
                                                                                  Choose a username — this is how other members will see you in stokvels and community groups.
                                                                                          </p>
                                                                                                  <form onSubmit={handleSubmit} className="space-y-4">
                                                                                                            <input
                                                                                                                        type="text"
                                                                                                                                    placeholder="Choose a username"
                                                                                                                                                value={username}
                                                                                                                                                            onChange={(e) => setUsernameInput(e.target.value)}
                                                                                                                                                                        className="w-full border border-brand-black/30 rounded-soft px-4 py-3 bg-white focus:border-brand-blue focus:outline-none"
                                                                                                                                                                                    required
                                                                                                                                                                                                minLength={3}
                                                                                                                                                                                                          />
                                                                                                                                                                                                                    {error && <p className="text-brand-ochre text-sm">{error}</p>}
                                                                                                                                                                                                                              <button
                                                                                                                                                                                                                                          type="submit"
                                                                                                                                                                                                                                                      disabled={loading}
                                                                                                                                                                                                                                                                  className="w-full bg-brand-blue text-brand-cream font-bold py-3 rounded-pill disabled:opacity-50"
                                                                                                                                                                                                                                                                            >
                                                                                                                                                                                                                                                                                        {loading ? 'Saving...' : 'Continue'}
                                                                                                                                                                                                                                                                                                  </button>
                                                                                                                                                                                                                                                                                                          </form>
                                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                                    </div>
                )
}

export default Username
