import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gamepad2, Zap, Brain, Hash, Trophy, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ---------------- Reaction Test ---------------- */
const ReactionGame = () => {
  const [state, setState] = useState<'idle' | 'waiting' | 'go' | 'done' | 'fail'>('idle');
  const [startedAt, setStartedAt] = useState(0);
  const [time, setTime] = useState(0);
  const [best, setBest] = useState<number>(() => Number(localStorage.getItem('mg_reaction_best') || 0));

  useEffect(() => {
    if (state !== 'waiting') return;
    const delay = 800 + Math.random() * 2500;
    const t = setTimeout(() => {
      setStartedAt(performance.now());
      setState('go');
    }, delay);
    return () => clearTimeout(t);
  }, [state]);

  const handleClick = () => {
    if (state === 'idle' || state === 'done' || state === 'fail') {
      setState('waiting');
    } else if (state === 'waiting') {
      setState('fail');
    } else if (state === 'go') {
      const t = Math.round(performance.now() - startedAt);
      setTime(t);
      setState('done');
      if (!best || t < best) {
        setBest(t);
        localStorage.setItem('mg_reaction_best', String(t));
      }
    }
  };

  const bg =
    state === 'go'
      ? 'bg-emerald-500/90 hover:bg-emerald-500'
      : state === 'waiting'
      ? 'bg-destructive/80'
      : state === 'fail'
      ? 'bg-yellow-600/80'
      : 'bg-primary/90 hover:bg-primary';

  const label =
    state === 'idle'
      ? 'Tap to Start'
      : state === 'waiting'
      ? 'Wait for GREEN…'
      : state === 'go'
      ? 'TAP NOW!'
      : state === 'fail'
      ? 'Too soon! Tap to retry'
      : `${time} ms — Tap to retry`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Test your reflexes</span>
        <span className="flex items-center gap-1 text-primary font-semibold">
          <Trophy className="h-4 w-4" /> Best: {best ? `${best} ms` : '—'}
        </span>
      </div>
      <button
        onClick={handleClick}
        className={`w-full h-72 rounded-xl text-2xl font-bold text-white transition-colors select-none ${bg}`}
      >
        {label}
      </button>
    </div>
  );
};

/* ---------------- Memory Match ---------------- */
const EMOJIS = ['🔥', '⚡', '💎', '🎯', '🏆', '🎮', '🚀', '👾'];
type MemCard = { id: number; emoji: string; flipped: boolean; matched: boolean };

const buildDeck = (): MemCard[] => {
  const pairs = [...EMOJIS, ...EMOJIS];
  return pairs
    .map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5)
    .map((c, i) => ({ ...c, id: i }));
};

const MemoryGame = () => {
  const [deck, setDeck] = useState<MemCard[]>(buildDeck);
  const [pick, setPick] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const won = deck.every((c) => c.matched);

  const flip = (id: number) => {
    if (lock) return;
    const c = deck[id];
    if (c.flipped || c.matched) return;
    const newDeck = deck.map((d) => (d.id === id ? { ...d, flipped: true } : d));
    const newPick = [...pick, id];
    setDeck(newDeck);
    setPick(newPick);
    if (newPick.length === 2) {
      setMoves((m) => m + 1);
      setLock(true);
      const [a, b] = newPick;
      const match = newDeck[a].emoji === newDeck[b].emoji;
      setTimeout(() => {
        setDeck((d) =>
          d.map((card) =>
            card.id === a || card.id === b
              ? { ...card, matched: match, flipped: match }
              : card,
          ),
        );
        setPick([]);
        setLock(false);
      }, 700);
    }
  };

  const reset = () => {
    setDeck(buildDeck());
    setPick([]);
    setMoves(0);
    setLock(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Moves: <span className="text-foreground font-semibold">{moves}</span></span>
        <Button size="sm" variant="outline" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-1" /> Reset
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {deck.map((c) => (
          <button
            key={c.id}
            onClick={() => flip(c.id)}
            className={`aspect-square rounded-lg text-3xl sm:text-4xl font-bold border transition-all ${
              c.flipped || c.matched
                ? c.matched
                  ? 'bg-emerald-500/20 border-emerald-500/50'
                  : 'bg-primary/20 border-primary/50'
                : 'bg-muted border-border hover:bg-muted/70'
            }`}
          >
            {c.flipped || c.matched ? c.emoji : '?'}
          </button>
        ))}
      </div>
      {won && (
        <div className="text-center py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
          🏆 You won in {moves} moves!
        </div>
      )}
    </div>
  );
};

/* ---------------- Tic Tac Toe vs AI ---------------- */
type Cell = 'X' | 'O' | null;

const winner = (b: Cell[]): Cell => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b1, c] of lines) if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  return null;
};

const aiMove = (b: Cell[]): number => {
  const empty = b.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  // try win
  for (const i of empty) {
    const t = [...b]; t[i] = 'O';
    if (winner(t) === 'O') return i;
  }
  // block
  for (const i of empty) {
    const t = [...b]; t[i] = 'X';
    if (winner(t) === 'X') return i;
  }
  if (empty.includes(4)) return 4;
  return empty[Math.floor(Math.random() * empty.length)];
};

const TicTacToe = () => {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const win = useMemo(() => winner(board), [board]);
  const draw = !win && board.every(Boolean);

  useEffect(() => {
    if (turn === 'O' && !win && !draw) {
      const t = setTimeout(() => {
        const i = aiMove(board);
        if (i !== undefined) {
          const nb = [...board]; nb[i] = 'O';
          setBoard(nb); setTurn('X');
        }
      }, 350);
      return () => clearTimeout(t);
    }
  }, [turn, board, win, draw]);

  const tap = (i: number) => {
    if (board[i] || win || turn !== 'X') return;
    const nb = [...board]; nb[i] = 'X';
    setBoard(nb); setTurn('O');
  };

  const reset = () => { setBoard(Array(9).fill(null)); setTurn('X'); };

  const status = win
    ? win === 'X' ? '🏆 You win!' : '🤖 AI wins!'
    : draw ? "It's a draw!" : turn === 'X' ? 'Your turn (X)' : 'AI thinking…';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{status}</span>
        <Button size="sm" variant="outline" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-1" /> New Game
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
        {board.map((c, i) => (
          <button
            key={i}
            onClick={() => tap(i)}
            className={`aspect-square rounded-lg text-5xl font-black border-2 transition-all ${
              c === 'X' ? 'text-primary border-primary/50 bg-primary/10' :
              c === 'O' ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10' :
              'border-border bg-muted hover:bg-muted/70'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------------- Number Guess ---------------- */
const NumberGuess = () => {
  const [target, setTarget] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [guess, setGuess] = useState('');
  const [hint, setHint] = useState('Guess a number between 1 and 100');
  const [tries, setTries] = useState(0);
  const [done, setDone] = useState(false);

  const submit = () => {
    const n = Number(guess);
    if (!n || n < 1 || n > 100) { setHint('Enter a valid number 1–100'); return; }
    setTries((t) => t + 1);
    if (n === target) { setHint(`🎉 Correct! Got it in ${tries + 1} tries`); setDone(true); }
    else if (n < target) setHint('📈 Higher!');
    else setHint('📉 Lower!');
    setGuess('');
  };

  const reset = () => {
    setTarget(Math.floor(Math.random() * 100) + 1);
    setGuess(''); setTries(0); setDone(false);
    setHint('Guess a number between 1 and 100');
  };

  return (
    <div className="space-y-4">
      <div className="text-center py-8 rounded-xl bg-muted/40 border border-border">
        <div className="text-lg font-semibold mb-2">{hint}</div>
        <div className="text-sm text-muted-foreground">Tries: {tries}</div>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !done && submit()}
          disabled={done}
          placeholder="Your guess"
          className="flex-1 h-11 rounded-md border border-input bg-background px-3 text-lg"
        />
        {done ? (
          <Button onClick={reset} variant="gaming">Play Again</Button>
        ) : (
          <Button onClick={submit} variant="gaming">Guess</Button>
        )}
      </div>
    </div>
  );
};

/* ---------------- Page ---------------- */
const games = [
  { id: 'reaction', title: 'Reaction Test', icon: Zap, desc: 'Tap as fast as you can', el: <ReactionGame /> },
  { id: 'memory', title: 'Memory Match', icon: Brain, desc: 'Find all the pairs', el: <MemoryGame /> },
  { id: 'ttt', title: 'Tic Tac Toe', icon: Gamepad2, desc: 'Beat the AI', el: <TicTacToe /> },
  { id: 'guess', title: 'Number Guess', icon: Hash, desc: 'Find the secret number', el: <NumberGuess /> },
];

const MiniGamesPage = () => {
  const [active, setActive] = useState('reaction');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-6 sm:py-10 max-w-4xl">
        <div className="mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold mb-3">
            <Gamepad2 className="h-3.5 w-3.5" /> TIME PASS ARENA
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-gradient mb-2">
            Mini Games
          </h1>
          <p className="text-muted-foreground">
            Waiting for your tournament? Pass the time and warm up your reflexes.
            <Link to="/tournaments" className="text-primary hover:underline ml-1">View tournaments →</Link>
          </p>
        </div>

        <Tabs value={active} onValueChange={setActive}>
          <TabsList className="grid grid-cols-4 w-full h-auto bg-muted/50 p-1">
            {games.map((g) => {
              const Icon = g.icon;
              return (
                <TabsTrigger
                  key={g.id}
                  value={g.id}
                  className="flex-col gap-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[11px] sm:text-xs">{g.title}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {games.map((g) => (
            <TabsContent key={g.id} value={g.id} className="mt-6">
              <Card className="p-4 sm:p-6 border-primary/20 bg-card/80 backdrop-blur">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{g.title}</h2>
                    <p className="text-sm text-muted-foreground">{g.desc}</p>
                  </div>
                  <g.icon className="h-7 w-7 text-primary" />
                </div>
                {g.el}
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default MiniGamesPage;
