'use client'
import { useState, useEffect, useRef } from 'react'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:       '#0B0F19',
  surface:  'rgba(255,255,255,0.03)',
  border:   'rgba(255,255,255,0.08)',
  primary:  '#6C63FF',
  accent:   '#00E5FF',
  purple:   '#A855F7',
  text:     '#E8E8F0',
  muted:    '#6B7280',
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #0B0F19; }

  @keyframes pulse-ring {
    0%   { transform: scale(1);   opacity: 0.5; }
    100% { transform: scale(2.8); opacity: 0;   }
  }
  @keyframes flow-dash {
    0%   { stroke-dashoffset: 300; }
    100% { stroke-dashoffset: 0;   }
  }
  @keyframes float-y {
    0%,100% { transform: translateY(0);    }
    50%     { transform: translateY(-14px); }
  }
  @keyframes glow-pulse {
    0%,100% { box-shadow: 0 0 24px rgba(108,99,255,.35); }
    50%     { box-shadow: 0 0 48px rgba(108,99,255,.65), 0 0 96px rgba(108,99,255,.2); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  @keyframes fade-up {
    from { opacity:0; transform:translateY(24px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  @keyframes blink-cursor {
    0%,100% { opacity:1; }
    50%     { opacity:0; }
  }
  @keyframes slide-in-right {
    from { opacity:0; transform:translateX(20px); }
    to   { opacity:1; transform:translateX(0);    }
  }
  @keyframes count-up {
    from { opacity:0; transform:translateY(16px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  @keyframes scan {
    0%   { top:-2px; }
    100% { top:100%; }
  }
  @keyframes grid-drift {
    0%   { background-position: 0 0;     }
    100% { background-position: 60px 60px; }
  }

  .glow-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    transition: border-color .3s, box-shadow .3s, transform .3s;
  }
  .glow-card:hover {
    border-color: rgba(108,99,255,.45);
    box-shadow: 0 0 40px rgba(108,99,255,.18);
    transform: translateY(-5px);
  }
  .tag {
    display:inline-block;
    padding:3px 10px;
    border-radius:99px;
    font-size:11px;
    font-weight:500;
    background:rgba(108,99,255,.15);
    color:#A99FFF;
    border:1px solid rgba(108,99,255,.25);
  }
  .mcp-tag {
    background:rgba(0,229,255,.1);
    color:#00E5FF;
    border:1px solid rgba(0,229,255,.25);
  }
`

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav style={{
      position:'fixed', top:0, left:0, right:0, zIndex:100,
      background:'rgba(11,15,25,.8)', backdropFilter:'blur(16px)',
      borderBottom:'1px solid rgba(255,255,255,.06)',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 40px', height:64,
    }}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{
          width:32,height:32,borderRadius:8,
          background:'linear-gradient(135deg,#6C63FF,#A855F7)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:14,fontWeight:700,fontFamily:"'Sora',sans-serif",
        }}>A</div>
        <span style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:16,color:'#fff'}}>
          AgentRegistry
        </span>
      </div>
      <div style={{display:'flex',gap:32,fontSize:14,color:C.muted}}>
        {['Registry','Docs','Pricing','Blog'].map(l => (
          <a key={l} href="#" style={{color:C.muted,textDecoration:'none',transition:'color .2s'}}
            onMouseEnter={e=>(e.currentTarget.style.color='#fff')}
            onMouseLeave={e=>(e.currentTarget.style.color=C.muted)}>{l}</a>
        ))}
      </div>
      <button style={{
        background:'linear-gradient(135deg,#6C63FF,#A855F7)',
        border:'none',color:'#fff',padding:'9px 22px',borderRadius:8,
        fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:13,cursor:'pointer',
      }}>Publish Skill</button>
    </nav>
  )
}

// ─── Animated Network SVG ─────────────────────────────────────────────────────
function NetworkGraph() {
  const nodes = [
    { x:340,y:200,r:30,label:'Registry', color:'#6C63FF',glow:true },
    { x:150,y:90, r:18,label:'Agent A',  color:'#00E5FF' },
    { x:530,y:75, r:18,label:'Agent B',  color:'#00E5FF' },
    { x:120,y:300,r:18,label:'Agent C',  color:'#00E5FF' },
    { x:560,y:310,r:18,label:'Agent D',  color:'#00E5FF' },
    { x:60, y:195,r:13,label:'GitHub',   color:'#A855F7' },
    { x:340,y:40, r:13,label:'Stripe',   color:'#A855F7' },
    { x:625,y:195,r:13,label:'Slack',    color:'#A855F7' },
    { x:340,y:365,r:13,label:'Notion',   color:'#A855F7' },
  ]
  const center = nodes[0]
  const edges  = nodes.slice(1).map(n => ({ x1:center.x,y1:center.y,x2:n.x,y2:n.y,color:n.color }))

  return (
    <svg viewBox="0 0 680 410" width="100%" style={{animation:'float-y 6s ease-in-out infinite'}}>
      <defs>
        {edges.map((e,i) => (
          <linearGradient key={i} id={`eg${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#6C63FF" stopOpacity="0.6"/>
            <stop offset="100%" stopColor={e.color}  stopOpacity="0.4"/>
          </linearGradient>
        ))}
      </defs>

      {/* Edges */}
      {edges.map((e,i) => (
        <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          stroke={`url(#eg${i})`} strokeWidth="1.5"
          strokeDasharray="8 4"
          style={{ animation:`flow-dash ${2.5+i*0.3}s linear infinite`, animationDelay:`${i*0.2}s` }}
        />
      ))}

      {/* Nodes */}
      {nodes.map((n,i) => (
        <g key={i}>
          {n.glow && (
            <>
              <circle cx={n.x} cy={n.y} r={n.r+4} fill="none" stroke={n.color} strokeWidth="1" opacity="0.3"
                style={{animation:'pulse-ring 2.5s ease-out infinite'}}/>
              <circle cx={n.x} cy={n.y} r={n.r+4} fill="none" stroke={n.color} strokeWidth="1" opacity="0.3"
                style={{animation:'pulse-ring 2.5s ease-out infinite',animationDelay:'1.25s'}}/>
            </>
          )}
          <circle cx={n.x} cy={n.y} r={n.r}
            fill={n.color+'22'} stroke={n.color} strokeWidth="1.5"/>
          <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle"
            fill={n.color} fontSize={n.r > 20 ? 11 : 9} fontFamily="'Sora',sans-serif" fontWeight="600">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', textAlign:'center',
      padding:'120px 40px 80px', position:'relative', overflow:'hidden',
    }}>
      {/* Animated grid background */}
      <div style={{
        position:'absolute',inset:0,
        backgroundImage:'linear-gradient(rgba(108,99,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,.07) 1px,transparent 1px)',
        backgroundSize:'60px 60px',
        animation:'grid-drift 8s linear infinite',
      }}/>
      {/* Radial glow */}
      <div style={{
        position:'absolute',top:'30%',left:'50%',transform:'translate(-50%,-50%)',
        width:600,height:600,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(108,99,255,.18) 0%,transparent 70%)',
        pointerEvents:'none',
      }}/>

      <div style={{position:'relative',zIndex:2,maxWidth:860,animation:'fade-up .8s ease both'}}>
        <div style={{
          display:'inline-flex',alignItems:'center',gap:8,
          background:'rgba(108,99,255,.12)',border:'1px solid rgba(108,99,255,.3)',
          borderRadius:99,padding:'6px 18px',marginBottom:32,
          fontSize:12,fontWeight:600,fontFamily:"'Sora',sans-serif",color:'#A99FFF',
          letterSpacing:'0.08em',
        }}>
          <span style={{width:6,height:6,borderRadius:'50%',background:'#00E5FF',display:'inline-block',animation:'blink-cursor 2s infinite'}}/>
          CURRENTLY IN BETA — JOIN THE WAITLIST
        </div>

        <h1 style={{
          fontFamily:"'Sora',sans-serif",fontWeight:800,
          fontSize:'clamp(42px,6vw,76px)',lineHeight:1.08,
          color:'#fff',marginBottom:24,letterSpacing:'-0.02em',
        }}>
          The{' '}
          <span style={{
            background:'linear-gradient(135deg,#6C63FF,#00E5FF)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
          }}>DNS Layer</span>
          <br/>for AI Agents
        </h1>

        <p style={{
          fontSize:19,color:C.muted,maxWidth:560,margin:'0 auto 48px',
          lineHeight:1.7,fontFamily:"'DM Sans',sans-serif",
        }}>
          Publish skills. Discover capabilities. Enable autonomous agents
          to find and execute any tool — dynamically, at runtime.
        </p>

        <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
          <button style={{
            background:'linear-gradient(135deg,#6C63FF,#A855F7)',
            border:'none',color:'#fff',padding:'15px 36px',borderRadius:10,
            fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:15,cursor:'pointer',
            animation:'glow-pulse 3s ease-in-out infinite',
          }}>Publish a Skill</button>
          <button style={{
            background:'transparent',border:'1px solid rgba(255,255,255,.2)',
            color:'#fff',padding:'15px 36px',borderRadius:10,
            fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:15,cursor:'pointer',
          }}>Explore Registry →</button>
        </div>

        <div style={{marginTop:80,width:'100%',maxWidth:680,margin:'80px auto 0'}}>
          <NetworkGraph/>
        </div>
      </div>
    </section>
  )
}

// ─── Discovery Demo ───────────────────────────────────────────────────────────
const STAGES = [
  { id:0, label:'Idle',         status:'Enter a task...' },
  { id:1, label:'Searching',    status:'Querying AgentRegistry...' },
  { id:2, label:'Skill Found',  status:'GitHub Skill matched!' },
  { id:3, label:'Manifest',     status:'Manifest loaded — 42 tokens' },
  { id:4, label:'Executing',    status:'Tool call in flight...' },
  { id:5, label:'Done',         status:'✓ 3 open issues found' },
]

const PIPELINE = ['Agent','Search','Match','Manifest','Execute']

function DiscoverySection() {
  const [stage, setStage] = useState(0)
  const [running, setRunning] = useState(false)
  const timerRef = useRef<NodeJS.Timeout|null>(null)

  const startDemo = () => {
    if (running) return
    setRunning(true)
    setStage(1)
  }

  useEffect(() => {
    if (running && stage < 5) {
      timerRef.current = setTimeout(() => setStage(s => s+1), stage === 0 ? 0 : 1100)
    }
    if (stage === 5) {
      setTimeout(() => { setRunning(false) }, 2000)
    }
    return () => { if(timerRef.current) clearTimeout(timerRef.current) }
  }, [stage, running])

  const traditionalTokens = 268
  const registryTokens    = 42
  const reduction         = Math.round((1 - registryTokens/traditionalTokens)*100)

  return (
    <section style={{padding:'100px 40px',maxWidth:1100,margin:'0 auto'}}>
      <div style={{textAlign:'center',marginBottom:64}}>
        <p style={{fontSize:12,letterSpacing:'0.1em',color:C.primary,fontWeight:600,marginBottom:12,fontFamily:"'Sora',sans-serif"}}>LIVE DEMO</p>
        <h2 style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:'clamp(28px,4vw,48px)',color:'#fff',marginBottom:16}}>
          Watch an Agent Discover a Skill
        </h2>
        <p style={{color:C.muted,fontSize:16,maxWidth:500,margin:'0 auto'}}>
          Zero hardcoding. Zero human intervention. The agent finds and calls the right tool itself.
        </p>
      </div>

      <div style={{
        display:'grid',gridTemplateColumns:'1fr 2fr 1fr',gap:24,alignItems:'start',
      }}>
        {/* Left — Prompt */}
        <div className="glow-card" style={{padding:28}}>
          <p style={{fontSize:11,color:C.muted,letterSpacing:'0.08em',fontWeight:600,marginBottom:16}}>AGENT PROMPT</p>
          <div style={{
            background:'rgba(0,0,0,.4)',borderRadius:8,padding:16,
            fontFamily:'monospace',fontSize:14,color:'#A99FFF',
            minHeight:60,
          }}>
            <span style={{color:C.muted}}>$ </span>
            {stage >= 1 ? 'Find my GitHub issues' : ''}
            {stage < 1 && <span style={{animation:'blink-cursor 1s infinite'}}>|</span>}
          </div>

          <div style={{marginTop:24}}>
            <p style={{fontSize:11,color:C.muted,letterSpacing:'0.08em',fontWeight:600,marginBottom:12}}>TOKEN SAVINGS</p>
            {[
              {label:'Traditional', tokens:traditionalTokens, color:'#EF4444', bg:'rgba(239,68,68,.1)'},
              {label:'AgentRegistry',tokens:registryTokens,   color:'#10B981', bg:'rgba(16,185,129,.1)'},
            ].map(row => (
              <div key={row.label} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12}}>
                  <span style={{color:C.muted}}>{row.label}</span>
                  <span style={{color:row.color,fontWeight:600}}>{row.tokens} tokens</span>
                </div>
                <div style={{height:6,borderRadius:99,background:'rgba(255,255,255,.06)'}}>
                  <div style={{
                    height:'100%',borderRadius:99,background:row.color,
                    width: stage >= 3 ? `${(row.tokens/traditionalTokens)*100}%` : '0%',
                    transition:'width 1.2s ease',
                  }}/>
                </div>
              </div>
            ))}
            {stage >= 3 && (
              <div style={{
                marginTop:16,textAlign:'center',padding:'10px',
                background:'rgba(16,185,129,.08)',borderRadius:8,
                border:'1px solid rgba(16,185,129,.2)',
                animation:'fade-up .4s ease both',
              }}>
                <span style={{color:'#10B981',fontWeight:700,fontSize:22}}>{reduction}%</span>
                <span style={{color:'#10B981',fontSize:12,marginLeft:6}}>token reduction</span>
              </div>
            )}
          </div>
        </div>

        {/* Center — Pipeline */}
        <div className="glow-card" style={{padding:32}}>
          <p style={{fontSize:11,color:C.muted,letterSpacing:'0.08em',fontWeight:600,marginBottom:28,textAlign:'center'}}>DISCOVERY PIPELINE</p>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:36,position:'relative'}}>
            {/* connecting line */}
            <div style={{position:'absolute',top:'50%',left:0,right:0,height:1,background:'rgba(255,255,255,.07)',zIndex:0}}/>
            <div style={{
              position:'absolute',top:'50%',left:0,height:1,
              background:'linear-gradient(90deg,#6C63FF,#00E5FF)',zIndex:1,
              width: stage > 0 ? `${Math.min((stage-1)/4*100,100)}%` : '0%',
              transition:'width 1s ease',
            }}/>

            {PIPELINE.map((step,i) => {
              const active  = stage > i
              const current = stage === i+1
              return (
                <div key={step} style={{zIndex:2,textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                  <div style={{
                    width:44,height:44,borderRadius:'50%',
                    background: active ? 'linear-gradient(135deg,#6C63FF,#A855F7)' : 'rgba(255,255,255,.05)',
                    border: current ? '2px solid #00E5FF' : active ? '2px solid #6C63FF' : '1px solid rgba(255,255,255,.12)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:13,fontWeight:700,fontFamily:"'Sora',sans-serif",
                    color: active ? '#fff' : C.muted,
                    transition:'all .5s ease',
                    boxShadow: current ? '0 0 20px rgba(0,229,255,.5)' : active ? '0 0 16px rgba(108,99,255,.4)' : 'none',
                  }}>{active ? '✓' : i+1}</div>
                  <span style={{fontSize:11,color: active ? '#fff' : C.muted,fontWeight:active?600:400,transition:'color .4s'}}>{step}</span>
                </div>
              )
            })}
          </div>

          {/* Status terminal */}
          <div style={{
            background:'rgba(0,0,0,.5)',borderRadius:10,padding:'20px 24px',
            fontFamily:'monospace',fontSize:14,minHeight:80,
            border:'1px solid rgba(255,255,255,.06)',position:'relative',overflow:'hidden',
          }}>
            {running && (
              <div style={{
                position:'absolute',top:0,left:0,right:0,height:2,
                background:'linear-gradient(90deg,transparent,#6C63FF,transparent)',
                animation:'scan 1.2s linear infinite',
              }}/>
            )}
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              {[C.primary,'#00E5FF','#A855F7'].map((c,i) => (
                <div key={i} style={{width:8,height:8,borderRadius:'50%',background:c}}/>
              ))}
              <span style={{fontSize:10,color:C.muted}}>agent.runtime</span>
            </div>
            <div style={{color:'#A99FFF'}}>
              <span style={{color:C.muted}}>→ </span>
              <span style={{animation: stage>0 ? 'fade-up .3s ease both' : undefined}}>
                {STAGES[stage]?.status}
              </span>
            </div>
            {stage === 5 && (
              <div style={{marginTop:8,color:'#10B981',animation:'fade-up .4s .1s ease both'}}>
                ✓ Manifest auto-generated — 42 tokens<br/>
                ✓ No hardcoding required<br/>
                ✓ Agent ready to call 3 tools
              </div>
            )}
          </div>

          <div style={{marginTop:20,textAlign:'center'}}>
            <button onClick={startDemo} disabled={running} style={{
              background: running ? 'rgba(108,99,255,.3)' : 'linear-gradient(135deg,#6C63FF,#A855F7)',
              border:'none',color:'#fff',padding:'12px 36px',borderRadius:8,
              fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:14,
              cursor: running ? 'not-allowed' : 'pointer',
              transition:'all .2s',
            }}>
              {running ? 'Running...' : stage === 5 ? 'Run Again' : '▶ Run Demo'}
            </button>
          </div>
        </div>

        {/* Right — Result */}
        <div className="glow-card" style={{padding:28}}>
          <p style={{fontSize:11,color:C.muted,letterSpacing:'0.08em',fontWeight:600,marginBottom:16}}>RESULT</p>
          {[
            { label:'GitHub Skill Found',  done: stage >= 2 },
            { label:'Manifest Loaded',     done: stage >= 3 },
            { label:'Response Generated',  done: stage >= 5 },
          ].map(r => (
            <div key={r.label} style={{
              display:'flex',alignItems:'center',gap:10,
              padding:'10px 14px',borderRadius:8,marginBottom:8,
              background: r.done ? 'rgba(16,185,129,.08)' : 'rgba(255,255,255,.02)',
              border: `1px solid ${r.done ? 'rgba(16,185,129,.25)' : 'rgba(255,255,255,.06)'}`,
              transition:'all .5s ease',
            }}>
              <span style={{
                width:18,height:18,borderRadius:'50%',
                background: r.done ? '#10B981' : 'rgba(255,255,255,.1)',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:10,flexShrink:0,transition:'background .5s',
              }}>{r.done ? '✓' : ''}</span>
              <span style={{fontSize:13,color: r.done ? '#fff' : C.muted,transition:'color .5s'}}>{r.label}</span>
            </div>
          ))}

          {stage >= 5 && (
            <div style={{
              marginTop:16,padding:16,borderRadius:10,
              background:'rgba(108,99,255,.1)',border:'1px solid rgba(108,99,255,.25)',
              animation:'slide-in-right .5s ease both',
            }}>
              <p style={{fontSize:11,color:C.muted,marginBottom:8}}>RESPONSE</p>
              <div style={{fontFamily:'monospace',fontSize:12,color:'#A99FFF',lineHeight:1.8}}>
                {`{\n  "issues": 3,\n  "repo": "AgentRegistry",\n  "latency": "94ms"\n}`}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Marketplace ──────────────────────────────────────────────────────────────
const SKILLS = [
  { name:'GitHub Connector', domain:'Dev', calls:'24k', stars:5,  tags:['Issues','PRs','Code'],   icon:'⌥' },
  { name:'Stripe Payments',  domain:'Finance', calls:'18k', stars:5,  tags:['Charges','Refunds'],  icon:'$' },
  { name:'Notion Docs',      domain:'Productivity', calls:'11k', stars:4,tags:['Pages','Blocks'],  icon:'N' },
  { name:'Slack Messenger',  domain:'Comms', calls:'31k', stars:5,  tags:['Channels','DMs'],       icon:'#' },
  { name:'Linear Tasks',     domain:'Dev', calls:'9k',  stars:4,  tags:['Issues','Sprints'],       icon:'L' },
  { name:'SendGrid Email',   domain:'Comms', calls:'15k', stars:4,  tags:['Send','Templates'],     icon:'@' },
]

const FILTERS = ['All','Dev','Finance','Productivity','Comms','Search']

function MarketplaceSection() {
  const [active, setActive] = useState('All')
  const filtered = SKILLS.filter(s => active === 'All' || s.domain === active)

  return (
    <section style={{padding:'100px 40px',background:'rgba(108,99,255,.03)',borderTop:'1px solid rgba(255,255,255,.04)'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:52}}>
          <p style={{fontSize:12,letterSpacing:'0.1em',color:C.primary,fontWeight:600,marginBottom:12,fontFamily:"'Sora',sans-serif"}}>MARKETPLACE</p>
          <h2 style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:'clamp(26px,4vw,44px)',color:'#fff'}}>
            Skills Ready to Deploy
          </h2>
        </div>

        <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginBottom:40}}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActive(f)} style={{
              padding:'8px 20px',borderRadius:99,border:'1px solid',cursor:'pointer',
              fontSize:13,fontWeight:500,fontFamily:"'DM Sans',sans-serif",
              background: active===f ? 'rgba(108,99,255,.2)' : 'transparent',
              borderColor: active===f ? 'rgba(108,99,255,.5)' : 'rgba(255,255,255,.12)',
              color: active===f ? '#A99FFF' : C.muted,
              transition:'all .2s',
            }}>{f}</button>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:20}}>
          {filtered.map((s,i) => (
            <div key={s.name} className="glow-card" style={{padding:24,cursor:'pointer',animation:`fade-up .5s ${i*0.06}s ease both`}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
                <div style={{
                  width:44,height:44,borderRadius:10,
                  background:'linear-gradient(135deg,rgba(108,99,255,.3),rgba(168,85,247,.2))',
                  border:'1px solid rgba(108,99,255,.25)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:18,fontWeight:700,
                }}>{s.icon}</div>
                <span className="tag mcp-tag" style={{fontSize:10}}>MCP Compatible</span>
              </div>
              <h3 style={{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:16,color:'#fff',marginBottom:6}}>{s.name}</h3>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                <span style={{color:'#F59E0B',fontSize:12}}>{'★'.repeat(s.stars)}{'☆'.repeat(5-s.stars)}</span>
                <span style={{color:C.muted,fontSize:12}}>{s.calls} calls</span>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {s.tags.map(t => <span key={t} className="tag">{t}</span>)}
                <span className="tag" style={{background:'rgba(0,229,255,.08)',color:'#00E5FF',borderColor:'rgba(0,229,255,.2)'}}>{s.domain}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function useCounter(target: number, active: boolean, duration = 2000) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    const start = performance.now()
    const step  = (now: number) => {
      const t = Math.min((now-start)/duration, 1)
      setVal(Math.floor(t * target))
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [active, target, duration])
  return val
}

function StatCard({ label, value, suffix, color }: { label:string; value:number; suffix:string; color:string }) {
  const ref    = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  const count  = useCounter(value, seen)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSeen(true) }, { threshold:.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className="glow-card" style={{padding:'32px 24px',textAlign:'center'}}>
      <div style={{
        fontFamily:"'Sora',sans-serif",fontWeight:800,
        fontSize:'clamp(32px,4vw,52px)',color,marginBottom:8,
        animation: seen ? 'count-up .6s ease both' : undefined,
      }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{fontSize:14,color:C.muted,fontFamily:"'DM Sans',sans-serif"}}>{label}</div>
    </div>
  )
}

function AnalyticsSection() {
  const stats = [
    { label:'Skills Published',    value:1420,   suffix:'',   color:C.primary },
    { label:'Active Agents',       value:21000,  suffix:'',   color:C.accent  },
    { label:'Requests Today',      value:3200000,suffix:'',   color:C.purple  },
    { label:'Avg Discovery Time',  value:120,    suffix:'ms', color:'#10B981' },
  ]
  return (
    <section style={{padding:'100px 40px',maxWidth:1100,margin:'0 auto'}}>
      <div style={{textAlign:'center',marginBottom:52}}>
        <p style={{fontSize:12,letterSpacing:'0.1em',color:C.primary,fontWeight:600,marginBottom:12,fontFamily:"'Sora',sans-serif"}}>TRACTION</p>
        <h2 style={{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:'clamp(26px,4vw,44px)',color:'#fff'}}>Registry at Scale</h2>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:20}}>
        {stats.map(s => <StatCard key={s.label} {...s}/>)}
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function FooterSection() {
  return (
    <footer style={{
      textAlign:'center',padding:'120px 40px',
      borderTop:'1px solid rgba(255,255,255,.06)',
      background:'rgba(108,99,255,.04)',position:'relative',overflow:'hidden',
    }}>
      <div style={{
        position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
        width:500,height:300,
        background:'radial-gradient(ellipse,rgba(108,99,255,.15) 0%,transparent 70%)',
        pointerEvents:'none',
      }}/>
      <p style={{
        fontFamily:"'Sora',sans-serif",fontWeight:700,
        fontSize:'clamp(22px,4vw,42px)',color:'#fff',
        lineHeight:1.2,marginBottom:24,position:'relative',
      }}>
        The next trillion internet users<br/>
        <span style={{background:'linear-gradient(135deg,#6C63FF,#00E5FF)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          won&apos;t be humans.
        </span>
      </p>
      <p style={{color:C.muted,fontSize:16,marginBottom:40,maxWidth:440,margin:'0 auto 40px',lineHeight:1.7}}>
        Build the skill layer for the agent economy. Publish your first skill in under 5 minutes.
      </p>
      <button style={{
        background:'linear-gradient(135deg,#6C63FF,#A855F7)',
        border:'none',color:'#fff',padding:'17px 48px',borderRadius:12,
        fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:16,cursor:'pointer',
        animation:'glow-pulse 3s ease-in-out infinite',
      }}>Start Publishing Skills →</button>
    </footer>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <main style={{ background: C.bg, minHeight:'100vh', color: C.text, overflowX:'hidden' }}>
        <Nav />
        <HeroSection />
        <DiscoverySection />
        <MarketplaceSection />
        <AnalyticsSection />
        <FooterSection />
      </main>
    </>
  )
}
