import { config } from 'dotenv';
import { Command, GuildTextableChannel, Member, Message } from 'eris';
config();
import CommandClient from 'eris-command-handler';
import Game from './GameLogic';
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
