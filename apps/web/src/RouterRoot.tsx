import { useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { NotFoundPage } from './404Page';
import { DashboardPage } from './DashboardPage';

export default function RouterRoot() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <Switch>
      <Route path="/" component={DashboardPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
