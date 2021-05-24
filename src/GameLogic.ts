import Map from 'collections/map';
import { Guild, GuildTextableChannel, Member, Message } from 'eris';
import MonopolyMap from './monopoly-data/map.json';
import ReactionMenu, {
  ReactionEmoji,
  ReactionMenuStateArg
} from './ReactionMenu';

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

function rollDice() {
  return (Math.floor(Math.random() * 100000) % 6) + 1;
}

class DiceRoll {
  public dice: number[];

  public get equal() {
    return this.dice.every(v => v === this.dice[0]);
  }

  public get sum() {
    return this.dice.reduce((a, b) => a + b);
  }

  constructor(count: number = 2) {
    this.dice = new Array(count).fill(rollDice());
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
  private curDiceRoll?: DiceRoll;

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
              this.reactionMenu?.setState('idleGame');
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
            let dmC = await user.user.getDMChannel();
            if (this.owner !== user.id) {
              this.removePlayer(user.id);
              await dmC.createMessage(
                'Aww, sorry to see you go, come play again sometime!'
              );
            } else {
              await dmC.createMessage({
                embed: {
                  title: "You can't leave.",
                  color: 0xff0000,
                  description:
                    "You can't leave the game you own! You'll have to "
                }
              });
            }
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
    this.reactionMenu.addState('idleGame', this.gameIdleState);
    this.reactionMenu.addState('diceRoll', this.diceRollState);
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
      this.reactionMenu?.removeAllUsers();
      this.reactionMenu?.addUser(this.getCurrentPlayer().member.id);
      return {
        content: this.playerListOrdered(),
        embed: {
          title: 'Monopoly',
          color: 0x36393f,
          description: 'lol',
          footer: {
            text: 'The owner can use ⤵ at any time to bring the game to the bottom of chat.'
          }
        }
      };
    },
    reactions: new Map([
      [
        '🎲',
        async (msg: Message<GuildTextableChannel>, user: Member) => {
          this.reactionMenu?.setState('diceRoll');
        }
      ],
      [
        '⤵',
        async (message: Message<GuildTextableChannel>, user: Member) => {
          this.reactionMenu?.newMenuMessage();
        }
      ],
      [
        '📧',
        async (message: Message<GuildTextableChannel>, user: Member) => {
          this.reactionMenu?.setState('tradeStart');
        }
      ],
      [
        new ReactionEmoji('bankrupt', '593118614031171586'),
        async (message: Message<GuildTextableChannel>, user: Member) => {
          this.reactionMenu?.setState('bankrupt');
        }
      ],
      [
        'ℹ',
        async (message: Message<GuildTextableChannel>, user: Member) => {
          //TODO: Send player info.
        }
      ]
    ])
  };

  private diceRollState: ReactionMenuStateArg = {
    message: () => {
      this.curDiceRoll = new DiceRoll();
      setTimeout(() => this.reactionMenu?.setState('move'), 2500);
      return {
        embed: {
          title: 'Rolling Dice... <a:loading1:470030932775272469>'
        }
      };
    },
    reactions: new Map()
  };

  private async movePlayer(player: Player) {
    if (player.curLoc === -1) return;
  }
}
