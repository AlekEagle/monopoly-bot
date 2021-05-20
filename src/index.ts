import { config } from 'dotenv';
import { GuildTextableChannel, Member, Message } from 'eris';
config();
import CommandClient from 'eris-command-handler';
import ReactionMenu, {ReactionEmoji} from './reactionMenu';
const client = new CommandClient(process.env.TOKEN, {}, {
  prefix: 'm?'
});

client.registerCommand('test', (msg: Message, args: string[]) => {
  const reactionMenu = new ReactionMenu(msg as Message<GuildTextableChannel>, {
    msgContent: 'a',
    reactions: [
      [new ReactionEmoji('😀').toString(), (message: Message<GuildTextableChannel>, user: Member) => {
        console.log(user);
      }]
    ]
  });

});



client.connect();