import type { LocalStore } from '../shell/store';
export function ticketWeek(date:Date){const start=new Date(date);start.setHours(0,0,0,0);start.setDate(start.getDate()-(start.getDay()+1)%7);return start.getTime();}
export class Tickets {
  private key='pvz2-web:ticket-week';
  constructor(private storage:Pick<Storage,'getItem'|'setItem'>,private shop:LocalStore){}
  refresh(date=new Date()){const week=String(ticketWeek(date)),previous=this.storage.getItem(this.key);if(previous!==null&&previous!==week)this.shop.spend('ticket',this.shop.read().ticket);this.storage.setItem(this.key,week);}
  collect(){this.refresh();this.shop.credit('ticket',100);}
}
