import {BehaviorSubject, Observable} from 'rxjs';
import {filter, skip} from 'rxjs/operators';
import {isDeepStrictEqual} from 'util';
import type CacheManager from '../manager/CacheManager';
import EntityWrapper, {Entity} from './EntityWrapper';

export default abstract class CacheEntityWrapper<
  TEntityState extends Entity | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TManager extends CacheManager<Exclude<TEntityState, undefined>, This, any>,
  This extends CacheEntityWrapper<TEntityState, TManager, This> = CacheEntityWrapper<
    TEntityState,
    TManager,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >
> extends EntityWrapper<TEntityState, TManager> {
  protected entitySubject: BehaviorSubject<TEntityState>;

  get entity(): Immutable<TEntityState> {
    return this.entitySubject.value as Immutable<TEntityState>;
  }

  private isCachedSubject = new BehaviorSubject<boolean>(true);

  get isCached(): boolean {
    return this.isCachedSubject.value;
  }

  get afterEntityChange(): Observable<TEntityState> {
    return this.entitySubject.pipe(skip(1));
  }

  get afterEntityChangeWithInitial(): Observable<TEntityState> {
    return this.entitySubject;
  }

  get afterCacheStateChange(): Observable<boolean> {
    return this.isCachedSubject.pipe(skip(1));
  }

  constructor(manager: TManager, syncStream: Observable<TEntityState>, entity: TEntityState) {
    super(manager);
    this.entitySubject = new BehaviorSubject(entity);
    const subscription = syncStream
      .pipe(filter(newEntity => !isDeepStrictEqual(newEntity, this.entity)))
      .subscribe(this.entitySubject);
    this.afterCacheStateChange.subscribe(() => subscription.unsubscribe());
  }

  protected setEntity(entity: TEntityState): void {
    this.entitySubject.next(entity);
  }

  uncache(): void {
    this.isCachedSubject.next(false);
  }
}
