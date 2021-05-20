import Map from 'collections/map';
import { Client, GuildTextableChannel, Message, Member, MessageContent } from 'eris';

export class ReactionEmoji {
  id?: string;
  name: string;
  constructor(name :string, id?: string) {
    this.name = name;
    this.id = id;
  }
  toString(): string {
    return `${this.name}${this.id ? `:${this.id}` : ''}`
  };
}

declare interface ReactionEmojiStruct {
  id?: string;
  name: string;
}

declare function ReactionEvent(message: Message<GuildTextableChannel>, user: Member): void;
declare type ReactionMenuMessageContentFunction = () => MessageContent;
declare type ReactionMenuMessageContent = MessageContent | ReactionMenuMessageContentFunction | undefined;
declare type ReactionHandlerInstance = (msg: Message<GuildTextableChannel>, reaction: ReactionEmoji, user: Member) => void;

declare const Reaction: [string, typeof ReactionEvent];

declare interface ReactionMenuOptions {
  msgContent: ReactionMenuMessageContent;
  reactions: typeof Reaction[]
}

declare interface ReactionMenuState {
  message: ReactionMenuMessageContent;
  reactions: Map<string, typeof ReactionEvent>;
}

export default class ReactionMenu {
  private client: Client;
  private channel: GuildTextableChannel;
  private reactionHandlerInstance: ReactionHandlerInstance;
  private originalMessage: Message<GuildTextableChannel>;
  private users: string[] = [];
  private menuMessage?: Message<GuildTextableChannel>;
  private state = 'default';
  private messageChanging = true;
  private states: Map<string, ReactionMenuState> = new Map();

  /**
   * A reactive menu to be controlled with reactions.
   * @param {Message} msg The message the user sent.
   * @param {ReactionMenuOptions} opts Additional options.
   * @param {MessageContent} opts.msgContent The content of the message for the default state of the reactionMenu.
   * @param {(typeof Reaction)[]} opts.reactions The reactions and their handlers for the default state of the reactionMenu.
   */
  constructor(msg: Message<GuildTextableChannel>, opts: ReactionMenuOptions) {
    this.client = msg.channel.guild.shard.client;
    this.channel = msg.channel;
    this.originalMessage = msg;
    this.users.push(msg.member.id);
    if (!this.channel.permissionsOf(this.client.user.id).has('manageMessages')) 
      throw 'Missing permission MANAGE_MESSAGES';
    
    this.reactionHandlerInstance = this.reactionAddListener.bind(this);
    this.states.set('default', { message: opts.msgContent, reactions: new Map(opts.reactions) });
    const rs = this.states.get('default') as ReactionMenuState;
    this.channel.createMessage(rs.message !== undefined ? typeof rs.message === 'function' ? rs.message() : rs.message : 'Do the thing!').then(rMsg => {
      this.menuMessage = rMsg;
      this.client.on('messageReactionAdd', this.reactionHandlerInstance);
      this.addReactions(Array.from(rs.reactions.keys())).then(() => {
        this.messageChanging = false;
      });
    }, err => {
      throw err;
    });
    
  }

  private async addReactions(reactions: string[]) {
    let index = 0;
    let addReaction = async (reaction: string) => {
      try {
        await this.menuMessage?.addReaction(reaction);
      } catch (err) {
        throw err;
      }
      if (reactions[++index] === undefined) return;
      else addReaction(reactions[index]);
    }
    if (reactions === undefined || reactions[index] === undefined) {
      return;
    }
    addReaction(reactions[index]);
  }

  private reactionAddListener(msg: Message<GuildTextableChannel>, reaction: ReactionEmoji, user: Member) {
    if (msg.id === this.menuMessage?.id && user.id !== this.client.user.id)
      this.menuMessage.removeReaction(reaction.id ? `${reaction.id}:${reaction.name}` : reaction.name, user.id).catch(() => { });
    if (msg.id === this.menuMessage?.id && this.users.includes(user.id) && !this.messageChanging) this.handleReaction(reaction, user);
  }

  private async handleReaction(reaction: ReactionEmojiStruct, user: Member) {
    const emoji = new ReactionEmoji(reaction.name, reaction.id);
    if (!this.states.has(this.state)) throw new Error(`State '${this.state}' does not exist`);
    const rs = this.states.get(this.state) as ReactionMenuState;
    const rse = rs.reactions.get(emoji.toString());
    if (rse) await rse(this.menuMessage as Message<GuildTextableChannel>, user);
    if (typeof rs.message === 'function') this.menuMessage?.edit(await rs.message());
  }

  public close() {
    this.client.off('messageReactionAdd', this.reactionHandlerInstance);
    this.menuMessage?.delete();
    this.originalMessage.delete();
  }

  public addUser(user: string) {
    if (!this.users.includes(user)) this.users.push(user);
    return this;
  }

  public removeUser(user: string) {
    if (this.users.includes(user)) this.users = this.users.filter(e => e !== user);
    return this;
  }

  public addState(state: string, opts: ReactionMenuState) {
    this.states.set(state, opts);
    return this;
  }

  public removeState(state: string) {
    this.states.delete(state);
    return this;
  }

  public addEmoji(state: string, reaction: typeof Reaction) {
    if (!this.states.has(state)) throw new Error(`State '${state}' does not exist`);
    this.states.get(state)?.reactions.set(reaction[0], reaction[1]);
    return this;
  }

  public removeEmoji(state: string, reaction: ReactionEmojiStruct) {
    const emoji = new ReactionEmoji(reaction.name, reaction.id);
    if (!this.states.has(state)) throw new Error(`State '${state}' does not exist`);
    if (!this.states.get(state)?.reactions.has(emoji.toString())) throw new Error(`Emoji '${emoji.toString()}' does not exist`);
    this.states.get(state)?.reactions.delete(emoji.toString());
    return this;
  }

  public async setState(state: string) {
    if (!this.states.has(state)) throw new Error(`State '${state}' does not exist`);
    this.messageChanging = true;
    this.state = state;
    await this.menuMessage?.removeReactions();
    const rs = this.states.get(this.state) as ReactionMenuState;
    if (rs.message) 
      await this.menuMessage?.edit(
        typeof rs.message === 'function' ? await rs.message() : rs.message
      );
    
    await this.addReactions(Array.from(rs.reactions.keys()));
    this.messageChanging = false;
    return;
  }
}