import {BehaviorSubject, Observable} from 'rxjs';
import {filter, first, map, skip} from 'rxjs/operators';
import type CacheManager from '../manager/CacheManager';
import EntityWrapper, {Entity} from './EntityWrapper';

export default abstract class CachedEntityWrapper<
  TEntityState extends Entity | undefined,
  TManager extends CacheManager
> extends EntityWrapper<TEntityState, TManager> {
  private isCachedSubject = new BehaviorSubject<boolean>(true);

  get isCached(): boolean {
    return this.isCachedSubject.value;
  }

  get afterUncache(): Observable<void> {
    return this.isCachedSubject.pipe(
      skip(1),
      filter(isCached => !isCached),
      map(() => {}),
      first()
    );
  }

  uncache(): void {
    this.isCachedSubject.next(false);
  }
}
