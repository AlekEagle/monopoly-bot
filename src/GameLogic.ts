import Map from 'collections/map';
import { GuildTextableChannel, Member, Message } from 'eris';
import MonopolyMap from './monopoly-data/map.json';
import ReactionMenu, { ReactionMenuStateArg } from './ReactionMenu';

class Player {
  public member: Member;
  public money = 1500;
  public curLoc = 0;
  public noJailCards = 0;
  public inDebt = false;
  public inDebtTo = null;
  public hasMortgages = false;
  public doubles = 0;

  constructor(member: Member) {
    this.member = member;
  }
}

export default class Game {
  private map = { ...MonopolyMap };
  private players: Map<string, Player> = new Map();
  private currentPlayer = 0;
  private owner: string;
  private active = false;
  private action = false;
  private reactionMenu?: ReactionMenu;

  constructor(msg: Message<GuildTextableChannel>) {
    this.owner = msg.author.id;
    this.players.set(this.owner, new Player(msg.member));

    this.reactionMenu = new ReactionMenu(msg, {
      msgContent: () => {
        return {
          embed: {
            title: "Let's play Monopoly!",
            color: 0x00ff00,
            description:
              'To join, react with 🚪!\nTo start, the creator of the game needs to react with ▶\nTo cancel the game, the creator of the game needs to react with ⏹\nTo leave the game, react with 🔚',
            fields: [
              {
                name: 'Players',
                value: this.playerList()
              }
            ],
            footer: {
              text: 'The owner can use ⤵ at any time to bring the game to the bottom of chat.'
            }
          }
        };
      },
      reactions: new Map([
        [
          '🚪',
          async (message: Message<GuildTextableChannel>, user: Member) => {
            await this.addPlayer(user);
          }
        ],
        [
          '▶',
          async (message: Message<GuildTextableChannel>, user: Member) => {
            if (this.players.size < 2) {
              this.reactionMenu?.setState('notEnoughPlayers');
            } else this.reactionMenu?.setState('idleGame');
          }
        ],
        [
          '⏹',
          async (message: Message<GuildTextableChannel>, user: Member) => {
            await this.reactionMenu?.setState('cancelGame');
          }
        ],
        [
          '🔚',
          async (message: Message<GuildTextableChannel>, user: Member) => {
            this.removePlayer(user.id);
            let dmC = await user.user.getDMChannel();
            await dmC.createMessage(
              'Aww, sorry to see you go, come play again sometime!'
            );
          }
        ],
        [
          '⤵',
          async (message: Message<GuildTextableChannel>, user: Member) => {
            if (user.id === this.owner) this.reactionMenu?.newMenuMessage();
          }
        ]
      ])
    });
    this.reactionMenu.addUser('any');

    this.reactionMenu.addState('cancelGame', {
      message: () => {
        setTimeout(() => this.reactionMenu?.close(), 5000);
        return {
          embed: {
            title: 'Game Canceled',
            color: 0xff0000,
            description:
              'Aww, I was looking forward to playing with you, maybe next time!'
          }
        };
      },
      reactions: new Map()
    });
    this.reactionMenu.addState('notEnoughPlayers', {
      message: () => {
        setTimeout(() => this.reactionMenu?.setState('default'), 15000);
        return {
          embed: {
            title: "I'm too stupid to play with you, sorry!",
            color: 0xffff00,
            description:
              "I'd love to play with you, but I don't know how yet, at the moment the creator of the bot doesn't have enough time to implement AI, [help support him on Patreon](https://patreon.com/alekeagle/) so he can put more time into the bot. Until then, you'll need at least one more player."
          }
        };
      },
      reactions: new Map()
    });
  }

  private playerList(): string {
    let plyrs = new Array(4).fill('Empty Slot');
    let plyrsVals = Array.from(this.players.values());
    for (let i = 0; i < this.players.size; i++) {
      plyrs[i] = `${i + 1}. ${plyrsVals[i].member.mention}`;
    }
    return plyrs.join('\n');
  }

  private playerListOrdered(): string {
    let plyrs = Array.from(this.players.entries());
    let plyrsOrdered = [];
    let curInd = this.currentPlayer;
    for (let i = 0; i < this.players.size; i++) {
      plyrsOrdered.push(plyrs[curInd++]);
      if (plyrs[curInd] === undefined) curInd = 0;
    }
    let list = plyrsOrdered.map((v, i, s) => {
      switch (i) {
        case 0:
          return `${v[1].member.mention}'s turn`;
        case 1:
          return `${v[1].member.mention} is up next`;
        case 2:
          return `${v[1].member.mention} is on deck`;
        case 3:
          return `${v[1].member.mention} is in the hole`;
      }
    });

    return list.join('\n');
  }

  private getCurrentPlayer(): Player {
    return Array.from(this.players.values())[this.currentPlayer];
  }

  private async nextPlayer(): Promise<void> {
    if (++this.currentPlayer === this.players.size) this.currentPlayer = 0;
  }

  private async addPlayer(mem: Member): Promise<void> {
    let dmC = await mem.user.getDMChannel();
    if (this.active) {
      await dmC.createMessage({
        embed: {
          title: 'The game already started!',
          color: 0xff0000,
          description: "Sorry! You can't join a game that has already started!"
        }
      });
      return;
    }
    if (this.players.has(mem.id)) {
      await dmC.createMessage({
        embed: {
          title: "You're already in the game silly!",
          color: 0xff0000,
          description: "There's no need to join again, you've already joined!"
        }
      });
      return;
    }
    this.players.set(mem.id, new Player(mem));
    return;
  }

  private async removePlayer(id: string): Promise<void> {
    if (!this.players.has(id)) throw new Error('User not found.');
    this.players.delete(id);
    if (this.players.size === this.currentPlayer) this.currentPlayer = 0;
    return;
  }

  private gameIdleState: ReactionMenuStateArg = {
    message: () => {
      return {
        content: this.playerListOrdered(),
        embed: {
          title: 'Monopoly',
          color: 0x36393f,
          description: 'lol'
        }
      };
    },
    reactions: new Map([])
  };
}
