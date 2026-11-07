import './styles/tokens.css';
import './styles/win98.css';
import './styles/app.css';

import { GameApp } from './app/game';

const stage = document.getElementById('stage');
if (!stage) throw new Error('Stage element missing');

const app = new GameApp(stage);
(window as unknown as { __pimpApp: GameApp }).__pimpApp = app;
