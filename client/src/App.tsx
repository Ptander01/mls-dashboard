import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import SplashIntro from "./components/SplashIntro";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FilterProvider } from "./contexts/FilterContext";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SplashIntro />
      <ThemeProvider defaultTheme="light" switchable>
        <FilterProvider>
          <TooltipProvider>
            <Router />
          </TooltipProvider>
        </FilterProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
