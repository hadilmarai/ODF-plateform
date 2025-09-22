package tn.esprit.examen.nomPrenomClasseExamen.aspects;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.stereotype.Component;
@Slf4j
@Component
@Aspect
public class LoggingAspect {
    @Pointcut("execution (* tn.esprit.examen.nomPrenomClasseExamen.services.UtilisateurService.ajouterUtilisateur())")
    public void methodCall() {}

    @Before("methodCall()")
    public void methodEntry(JoinPoint joinPoint){

        log.info("In Method : "+joinPoint.getSignature().getName());
    }



}
