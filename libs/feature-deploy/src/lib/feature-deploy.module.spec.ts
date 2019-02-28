import { async, TestBed } from '@angular/core/testing';
import { FeatureDeployModule } from './feature-deploy.module';

describe('FeatureDeployModule', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [FeatureDeployModule]
    }).compileComponents();
  }));

  it('should create', () => {
    expect(FeatureDeployModule).toBeDefined();
  });
});
