// Score backend is now handled by ScoreClient (MAGMA//OPS dashboard)
// No external API keys needed

// Game Constants
const GAP = 180;
const OBSTACLE_WIDTH = 60;
const OBSTACLE_SPEED = 3;

// Star Field Content
const STAR_CONTENT = `                                                                                                                                                      
                                                                                                         .                                            
 '                              +  +                             +                                                                                    
                                o                                  o                                                          .                       
            *                                    o                  '                                                          +                      
                     '                                                             * +        .   *                                                   
                            o                                                                           +        .                                    
                                                                                                                                                      
                                                                                                '                                                  +  
                                                                                                                                                      
                                                         '                                                                                            
              .              +                                                               '                                                        
                                                                                                                                              +  .    
                                                                                                                                                      
                                                                .                                                                 .        * +        
                                                      +                                      o                                                        
                        *                                                        *      o                       '                                     
    .                                             +                                                          .'                                       
                   '              .        '                                                              *                                           
                                                                                                    *                                                 
                                                                                                                                                      
                                                               '                                                                                      
                                                                                                                                  .       .           
                                                                                                                                                      
                                                                                                                                                    ' 
      *                                                                                              +                                     |          
                     '                                                  .                                                                - o -        
                                                           |                                               o                               |          
     *                                                    -+-                                                    '                                    
               +                    '                      |  .              '                |                                                       
                 .                                    *        .                            - o -                         o                           
                                        o                                                     |                                                       
                                                                    '                                                                          +      
  +                  +                                                                                                                                
                               +                            +                                               .                                         
                               +                                 '                                                                                    
                                                                                                                             '                        
                   +                                                                                +                                                 
                                     .                     .                       ++                                                                 
                   | .                                                                +                                     .                         
                 --o--                                                                                                                                
                   |                                                                                                                                  
                                                                                 +                                                       +            
                                                  *                       '                                                                           
                                                                         '                                                                            
                                                                    .                       .                                                         
                                                 .                           |                                                                        
                                                                           - o -                            '                                         
                     .                                                       |                                                                        
                                                                                    | .                                                               
                                                                                  - o -                                                               
                                                                                    |                                                   o             
    +                                                                                           .                                                     
                                                            '                                                                      o                  
                                                                                .                                                                     
                                                    .                                                                                                 
                                                                                  o                                                                  .
                                                   .                                                                                                  
                                                                                       +                                   _|_                        
                                                           '                                                                |                         
                                                                                                                                                      
                 '                                                                                                                                    
  '                       *                                    +                                                                             +        
               .                                                                                                 \\                                    
                            .                                                                      .              \\                  .                
                      /                                                                                            *                              o   
                 '   /                                        /      '                                                                                
                    *                                        /                                                                                        
                                                            *                                                   '                                     
                                                        +                                     .            .                                          
           '    |             o                                       o                                           o                                   
               -+-                            '               '               .                    .                         . _|_                    
                |                                                                                 .                             |                     
                                                                                                                                                      
                                      o                                                                                                               
                   +                                                                                                  +                  '           .
                                                                                                                                                      
                                                                                    '             .                       +                           
                                                                                     o                                         .                      
                                                    .  '                                                               .                              `;