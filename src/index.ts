import { config } from 'dotenv';
import { Command, GuildTextableChannel, Member, Message } from 'eris';
config();
import CyclicArray from './CyclicArray';
import CommandClient from 'eris-command-handler';
import Game from './GameLogic';
import { HighlightSpanKind } from 'typescript';
import { SourceMap } from 'module';
const client = new CommandClient(
  process.env.TOKEN,
  {},
  {
    prefix: 'm?'
  }
);

client.registerCommand(
  'test',
  (msg: Message<GuildTextableChannel>, args: string[]) => {
    new Game(msg);
  },
  {
    guildOnly: true
  }
);

client.connect();

const thing = new CyclicArray<CyclicArray<CyclicArray<number>>>(50);
thing.fill(
  new CyclicArray<CyclicArray<number>>(5).fill(
    new CyclicArray<number>(5).fill(1)
  )
);
console.log(thing);
console.log(thing.flat(1));
