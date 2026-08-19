import { useState } from 'react'

const PRESETS = [
      { liters: 20, container: '30L container' },
        { liters: 30, container: '50L Ifatyi' },
          { liters: 50, container: '100L Ifatyi' },
            { liters: 100, container: '200L Ifatyi' },
]

// Linear 1:1:1 scaling — 1 liter of target volume = 0.1kg of each grain,
// confirmed consistent across all four given reference points.
function calculateIngredients(liters) {
      const kgEach = (liters * 0.1).toFixed(1)
        return { maizeMeal: kgEach, umbona: kgEach, amazimba: kgEach }
}

function nearestContainer(liters) {
      const sorted = [...PRESETS].sort((a, b) => Math.abs(a.liters - liters) - Math.abs(b.liters - liters))
        return sorted[0].container
}

const STEPS = [
      { title: 'Ukudidiyela', day: 'Day 1', text: 'Boil water over an eziko/wood fire in a traditional pot, mix with maize meal and umbona. Once cooled at night, add the first half of the amazimba.' },
        { title: 'Ukupheka Izidudu', day: 'Day 2, morning', text: 'Cook the mixture into izidudu. Transfer into 15–20kg enamel dishes and let cool completely.' },
          { title: 'Ukufaka', day: 'Day 2, after cooling', text: 'Transfer into the ifatyi (blue plastic container) sized for your volume, and add the remaining amazimba.' },
            { title: 'Fermenting Stage', day: 'Day 3', text: 'Let it stand undisturbed for a full day to rise and form rich foam (igwebu). [Term pending verification — flag any correction to Thandu.]' },
              { title: 'Ukuhluza', day: 'Day 4', text: 'Strain the mixture completely using traditional strainers to extract the sacred, thin liquid the people and elders will drink.' },
]

function UmqombothiCalculator({ onBack }) {
      const [liters, setLiters] = useState(30)
        const { maizeMeal, umbona, amazimba } = calculateIngredients(liters)

          return (
                  <div className="min-h-screen pb-24 bg-cream">
                        <div className="bg-gradient-to-br from-sage-500 to-sage-600 text-white px-5 pt-10 pb-6 rounded-b-[2.5rem]">
                                <button onClick={onBack} className="text-sm text-white/70 mb-3 block">← Back</button>
                                        <h1 className="font-display font-bold text-2xl">Umqombothi Brewing</h1>
                                                <p className="text-white/70 text-sm mt-1">Scaled to your ceremony size.</p>
                                                      </div>

                                                            <div className="px-4 mt-4">
                                                                    <div className="bg-white border-2 border-ink rounded-soft p-4 mb-4">
                                                                              <p className="text-xs font-black uppercase text-ink-muted mb-3">Choose your volume</p>
                                                                                        <div className="flex gap-2 mb-4">
                                                                                                    {PRESETS.map((p) => (
                                                                                                                      <button key={p.liters} onClick={() => setLiters(p.liters)}
                                                                                                                                      className={`flex-1 py-2 rounded-pill text-xs font-bold ${liters === p.liters ? 'bg-sage-500 text-white' : 'bg-cream-dark text-ink-muted'}`}>
                                                                                                                                                      {p.liters}L
                                                                                                                                                                    </button>
                                                                                                    ))}
                                                                                                              </div>
                                                                                                                        <input type="range" min="10" max="150" step="5" value={liters} onChange={(e) => setLiters(parseInt(e.target.value))}
                                                                                                                                    className="w-full accent-sage-500" />
                                                                                                                                              <p className="text-center font-display font-extrabold text-3xl text-ink mt-2">{liters}L</p>
                                                                                                                                                        <p className="text-center text-xs text-ink-muted">Fits a {nearestContainer(liters)}</p>
                                                                                                                                                                </div>

                                                                                                                                                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                                                                                                                                                                  <div className="bg-terracotta/10 border border-terracotta/30 rounded-soft p-3 text-center">
                                                                                                                                                                                              <p className="text-lg font-black text-terracotta">{maizeMeal}kg</p>
                                                                                                                                                                                                          <p className="text-[10px] text-ink-muted uppercase font-bold">Maize Meal</p>
                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                              <div className="bg-terracotta/10 border border-terracotta/30 rounded-soft p-3 text-center">
                                                                                                                                                                                                                                          <p className="text-lg font-black text-terracotta">{umbona}kg</p>
                                                                                                                                                                                                                                                      <p className="text-[10px] text-ink-muted uppercase font-bold">Umbona</p>
                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                          <div className="bg-terracotta/10 border border-terracotta/30 rounded-soft p-3 text-center">
                                                                                                                                                                                                                                                                                      <p className="text-lg font-black text-terracotta">{amazimba}kg</p>
                                                                                                                                                                                                                                                                                                  <p className="text-[10px] text-ink-muted uppercase font-bold">Amazimba</p>
                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                                                    </div>

                                                                                                                                                                                                                                                                                                                            <p className="text-xs font-black uppercase text-ink-muted mb-2">Brewing Steps</p>
                                                                                                                                                                                                                                                                                                                                    <div className="space-y-2">
                                                                                                                                                                                                                                                                                                                                              {STEPS.map((step, i) => (
                                                                                                                                                                                                                                                                                                                                                              <div key={i} className="bg-white border-2 border-ink/15 rounded-soft p-4">
                                                                                                                                                                                                                                                                                                                                                                            <div className="flex justify-between items-start mb-1">
                                                                                                                                                                                                                                                                                                                                                                                            <p className="font-bold text-sm text-ink">{step.title}</p>
                                                                                                                                                                                                                                                                                                                                                                                                            <span className="text-[10px] font-bold text-sage-600 bg-sage-50 px-2 py-0.5 rounded-pill">{step.day}</span>
                                                                                                                                                                                                                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                        <p className="text-xs text-ink-muted leading-relaxed">{step.text}</p>
                                                                                                                                                                                                                                                                                                                                                                                                                                                    </div>
                                                                                                                                                                                                                                                                                                                                              ))}
                                                                                                                                                                                                                                                                                                                                                      </div>
                                                                                                                                                                                                                                                                                                                                                            </div>
                                                                                                                                                                                                                                                                                                                                                                </div>
          )
}

export default UmqombothiCalculator
